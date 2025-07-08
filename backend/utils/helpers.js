// utils/helpers.js
// Location: /backend/utils/helpers.js

const logger = require('./logger');

// Response helper functions
const successResponse = (res, data = null, message = 'Success', statusCode = 200) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString()
  };
  
  if (data !== null) {
    response.data = data;
  }
  
  return res.status(statusCode).json(response);
};

const errorResponse = (res, message = 'Internal Server Error', statusCode = 500, code = null) => {
  const response = {
    success: false,
    error: {
      message,
      code: code || `HTTP_${statusCode}`
    },
    timestamp: new Date().toISOString()
  };
  
  return res.status(statusCode).json(response);
};

const paginatedResponse = (res, data, pagination, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination,
    timestamp: new Date().toISOString()
  });
};

// Pagination helpers
const calculatePagination = (page = 1, limit = 10, totalCount = 0) => {
  const currentPage = Math.max(1, parseInt(page));
  const itemsPerPage = Math.min(100, Math.max(1, parseInt(limit)));
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const offset = (currentPage - 1) * itemsPerPage;
  
  return {
    currentPage,
    itemsPerPage,
    totalPages,
    totalCount,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    nextPage: currentPage < totalPages ? currentPage + 1 : null,
    previousPage: currentPage > 1 ? currentPage - 1 : null,
    offset,
    limit: itemsPerPage
  };
};

const extractPaginationParams = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = (query.sortOrder || 'desc').toLowerCase();
  
  return {
    page: Math.max(1, page),
    limit: Math.min(100, Math.max(1, limit)),
    sortBy,
    sortOrder: ['asc', 'desc'].includes(sortOrder) ? sortOrder : 'desc'
  };
};

// Data formatting helpers
const formatUser = (user, includePrivate = false) => {
  if (!user) return null;
  
  const formatted = {
    id: user.id,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar,
    createdAt: user.createdAt
  };
  
  if (includePrivate) {
    formatted.email = user.email;
    formatted.isActive = user.isActive;
    formatted.updatedAt = user.updatedAt;
  }
  
  return formatted;
};

const formatPlace = (place, userLocation = null) => {
  if (!place) return null;
  
  const formatted = {
    id: place.id,
    googlePlaceId: place.googlePlaceId,
    name: place.name,
    address: place.address,
    location: {
      latitude: place.latitude,
      longitude: place.longitude
    },
    placeType: place.placeType,
    rating: place.rating,
    priceLevel: place.priceLevel,
    phoneNumber: place.phoneNumber,
    website: place.website,
    businessStatus: place.businessStatus,
    openingHours: place.openingHours,
    photos: place.photos || [],
    lastUpdated: place.lastUpdated
  };
  
  // Calculate distance if user location provided
  if (userLocation && userLocation.latitude && userLocation.longitude) {
    formatted.distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      place.latitude,
      place.longitude
    );
  }
  
  return formatted;
};

const formatLocation = (location) => {
  if (!location) return null;
  
  return {
    id: location.id,
    coordinates: {
      latitude: location.latitude,
      longitude: location.longitude
    },
    accuracy: location.accuracy,
    address: location.address,
    city: location.city,
    country: location.country,
    timestamp: location.timestamp
  };
};

// Distance calculation (Haversine formula)
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return Math.round(R * c); // Distance in meters, rounded
};

// Format distance for display
const formatDistance = (distanceInMeters) => {
  if (!distanceInMeters || distanceInMeters < 0) return null;
  
  if (distanceInMeters < 1000) {
    return `${distanceInMeters}m`;
  } else {
    const km = (distanceInMeters / 1000).toFixed(1);
    return `${km}km`;
  }
};

// Time formatting helpers
const timeAgo = (date) => {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now - past) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  return `${Math.floor(diffInSeconds / 31536000)}y ago`;
};

const formatDate = (date, format = 'ISO') => {
  if (!date) return null;
  
  const d = new Date(date);
  
  switch (format) {
    case 'ISO':
      return d.toISOString();
    case 'local':
      return d.toLocaleString();
    case 'date':
      return d.toLocaleDateString();
    case 'time':
      return d.toLocaleTimeString();
    default:
      return d.toISOString();
  }
};

// String manipulation helpers
const capitalize = (str) => {
  if (!str || typeof str !== 'string') return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const truncateText = (text, maxLength = 100, suffix = '...') => {
  if (!text || typeof text !== 'string') return text;
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
};

const slugify = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

// Array helpers
const removeDuplicates = (array, key = null) => {
  if (!Array.isArray(array)) return array;
  
  if (key) {
    const seen = new Set();
    return array.filter(item => {
      const keyValue = item[key];
      if (seen.has(keyValue)) {
        return false;
      }
      seen.add(keyValue);
      return true;
    });
  }
  
  return [...new Set(array)];
};

const sortByDistance = (places, userLat, userLng) => {
  if (!Array.isArray(places) || !userLat || !userLng) return places;
  
  return places
    .map(place => ({
      ...place,
      distance: calculateDistance(userLat, userLng, place.latitude, place.longitude)
    }))
    .sort((a, b) => a.distance - b.distance);
};

const groupBy = (array, key) => {
  if (!Array.isArray(array)) return {};
  
  return array.reduce((groups, item) => {
    const group = item[key];
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(item);
    return groups;
  }, {});
};

// Object helpers
const pick = (obj, keys) => {
  if (!obj || typeof obj !== 'object') return {};
  
  const result = {};
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
};

const omit = (obj, keys) => {
  if (!obj || typeof obj !== 'object') return {};
  
  const result = { ...obj };
  keys.forEach(key => {
    delete result[key];
  });
  return result;
};

const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const cloned = {};
    for (const key in obj) {
      cloned[key] = deepClone(obj[key]);
    }
    return cloned;
  }
};

// Cache key generators
const generateCacheKey = (...parts) => {
  return parts
    .filter(part => part !== null && part !== undefined)
    .map(part => String(part))
    .join(':');
};

const generateLocationCacheKey = (lat, lng, radius, type) => {
  return generateCacheKey('location', lat, lng, radius, type);
};

const generateUserCacheKey = (userId) => {
  return generateCacheKey('user', userId);
};

// Error handling helpers
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Rate limiting helpers
const generateRateLimitKey = (identifier, action) => {
  return `rate_limit:${action}:${identifier}`;
};

const getRemainingTime = (timestamp, windowMs) => {
  const now = Date.now();
  const windowStart = timestamp - (timestamp % windowMs);
  const windowEnd = windowStart + windowMs;
  return Math.max(0, windowEnd - now);
};

// Environment helpers
const isDevelopment = () => process.env.NODE_ENV === 'development';
const isProduction = () => process.env.NODE_ENV === 'production';
const isTest = () => process.env.NODE_ENV === 'test';

// URL helpers
const buildUrl = (baseUrl, path, params = {}) => {
  const url = new URL(path, baseUrl);
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined) {
      url.searchParams.append(key, params[key]);
    }
  });
  return url.toString();
};

// Random generators
const generateRandomString = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const generateRandomNumber = (min = 0, max = 100) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Logging helpers
const logRequest = (req, additionalData = {}) => {
  logger.info('API Request', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    ...additionalData
  });
};

const logError = (error, context = {}) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    ...context
  });
};

module.exports = {
  // Response helpers
  successResponse,
  errorResponse,
  paginatedResponse,
  
  // Pagination helpers
  calculatePagination,
  extractPaginationParams,
  
  // Data formatting
  formatUser,
  formatPlace,
  formatLocation,
  
  // Distance and location
  calculateDistance,
  formatDistance,
  sortByDistance,
  
  // Time helpers
  timeAgo,
  formatDate,
  
  // String helpers
  capitalize,
  truncateText,
  slugify,
  
  // Array helpers
  removeDuplicates,
  groupBy,
  
  // Object helpers
  pick,
  omit,
  deepClone,
  
  // Cache helpers
  generateCacheKey,
  generateLocationCacheKey,
  generateUserCacheKey,
  
  // Error helpers
  asyncHandler,
  catchAsync,
  
  // Rate limiting
  generateRateLimitKey,
  getRemainingTime,
  
  // Environment
  isDevelopment,
  isProduction,
  isTest,
  
  // URL helpers
  buildUrl,
  
  // Random generators
  generateRandomString,
  generateRandomNumber,
  
  // Logging helpers
  logRequest,
  logError
};