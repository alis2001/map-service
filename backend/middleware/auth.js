// middleware/auth.js
// Location: /backend/middleware/auth.js

const jwt = require('jsonwebtoken');
const { prisma } = require('../config/prisma');
const logger = require('../utils/logger');
const { cache } = require('../config/redis');

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

// Generate JWT token
const generateToken = (userId) => {
  try {
    const payload = {
      userId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    };
    
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRE
    });
    
    logger.debug('JWT token generated', { userId });
    return token;
  } catch (error) {
    logger.error('JWT token generation failed', {
      userId,
      error: error.message
    });
    throw new Error('Token generation failed');
  }
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      throw new Error('Token verification failed');
    }
  }
};

// Extract token from request headers
const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7); // Remove 'Bearer ' prefix
  }
  
  // Also check for token in cookies
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  
  // Check query parameter (for development/testing only)
  if (process.env.NODE_ENV === 'development' && req.query.token) {
    return req.query.token;
  }
  
  return null;
};

// Main authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Access token is required',
          code: 'NO_TOKEN'
        }
      });
    }
    
    // Verify the token
    const decoded = verifyToken(token);
    const userId = decoded.userId;
    
    // Check if user exists in cache first
    const cacheKey = `user:${userId}`;
    let user = await cache.get(cacheKey);
    
    if (!user) {
      // Fetch user from database
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          }
        });
      }
      
      // Cache user data for 15 minutes
      await cache.set(cacheKey, user, 900);
    }
    
    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Account is deactivated',
          code: 'ACCOUNT_DEACTIVATED'
        }
      });
    }
    
    // Add user info to request object
    req.user = user;
    req.token = token;
    
    logger.debug('User authenticated successfully', {
      userId: user.id,
      email: user.email
    });
    
    next();
    
  } catch (error) {
    logger.warn('Authentication failed', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Handle specific JWT errors
    if (error.message === 'Token expired') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Token has expired',
          code: 'TOKEN_EXPIRED'
        }
      });
    }
    
    if (error.message === 'Invalid token') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid authentication token',
          code: 'INVALID_TOKEN'
        }
      });
    }
    
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication failed',
        code: 'AUTH_FAILED'
      }
    });
  }
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      req.user = null;
      return next();
    }
    
    const decoded = verifyToken(token);
    const userId = decoded.userId;
    
    // Try to get user (don't fail if user doesn't exist)
    const user = await prisma.user.findUnique({
      where: { id: userId, isActive: true },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        createdAt: true
      }
    });
    
    req.user = user || null;
    req.token = token;
    
    next();
    
  } catch (error) {
    // For optional auth, we don't fail on errors
    req.user = null;
    next();
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        }
      });
    }
    
    // For now, we don't have roles in our schema
    // This is prepared for future role-based access control
    if (roles.length > 0) {
      const userRole = req.user.role || 'user';
      
      if (!roles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Insufficient permissions',
            code: 'INSUFFICIENT_PERMISSIONS'
          }
        });
      }
    }
    
    next();
  };
};

// Check if user owns the resource
const checkOwnership = (resourceField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        }
      });
    }
    
    const resourceUserId = req.params[resourceField] || req.body[resourceField];
    
    if (resourceUserId && resourceUserId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied: You can only access your own resources',
          code: 'OWNERSHIP_REQUIRED'
        }
      });
    }
    
    next();
  };
};

// Rate limiting for authentication attempts
const authRateLimit = async (req, res, next) => {
  try {
    const identifier = req.ip || 'unknown';
    const key = `auth_attempts:${identifier}`;
    
    const attempts = await cache.get(key) || 0;
    
    if (attempts >= 5) {
      return res.status(429).json({
        success: false,
        error: {
          message: 'Too many authentication attempts. Please try again later.',
          code: 'TOO_MANY_ATTEMPTS'
        }
      });
    }
    
    // Increment attempts
    await cache.set(key, attempts + 1, 900); // 15 minutes
    
    next();
    
  } catch (error) {
    // If cache fails, allow the request to continue
    logger.warn('Auth rate limit check failed', { error: error.message });
    next();
  }
};

// Clear authentication attempts on successful login
const clearAuthAttempts = async (identifier) => {
  try {
    const key = `auth_attempts:${identifier}`;
    await cache.del(key);
  } catch (error) {
    logger.warn('Failed to clear auth attempts', { 
      identifier, 
      error: error.message 
    });
  }
};

// Logout - invalidate token (if using token blacklist)
const logout = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (token) {
      // Add token to blacklist cache
      const decoded = verifyToken(token);
      const blacklistKey = `blacklist:${token}`;
      const remainingTime = decoded.exp - Math.floor(Date.now() / 1000);
      
      if (remainingTime > 0) {
        await cache.set(blacklistKey, true, remainingTime);
      }
      
      // Clear user cache
      if (req.user) {
        const userCacheKey = `user:${req.user.id}`;
        await cache.del(userCacheKey);
      }
    }
    
    next();
    
  } catch (error) {
    logger.warn('Logout process failed', { error: error.message });
    next();
  }
};

// Check if token is blacklisted
const checkBlacklist = async (token) => {
  try {
    const blacklistKey = `blacklist:${token}`;
    const isBlacklisted = await cache.get(blacklistKey);
    return !!isBlacklisted;
  } catch (error) {
    logger.warn('Blacklist check failed', { error: error.message });
    return false;
  }
};

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  optionalAuth,
  authorize,
  checkOwnership,
  authRateLimit,
  clearAuthAttempts,
  logout,
  checkBlacklist,
  extractToken
};