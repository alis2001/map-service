// middleware/auth.js
// Simple JWT authentication middleware

const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      message: 'Please provide a valid authentication token' 
    });
  }

  try {
    // For now, just decode without verification for testing
    // In production, use: jwt.verify(token, process.env.JWT_SECRET)
    const decoded = jwt.decode(token);
    
    if (!decoded || !decoded.id) {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Token does not contain valid user information' 
      });
    }

    // Add user info to request
    req.user = {
      id: decoded.id,
      firstName: decoded.firstName || '',
      lastName: decoded.lastName || '',
      username: decoded.username || '',
      email: decoded.email || ''
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ 
      error: 'Invalid token',
      message: 'Failed to authenticate token' 
    });
  }
};

module.exports = { authenticateToken };
