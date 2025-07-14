// utils/helpers.js - OPTIMIZED VERSION with Fixed Cache Keys
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
const formatUser = (user) => {
  if (!user) return null;

  const formatted = {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };

  // Remove password and other sensitive fields
  delete formatted.password;
  delete formatted.resetToken;
  delete formatted.emailVerificationToken;

  return formatted;
};

const formatPlace = (place) => {
  if (!place) return null;

  return {
    id: place.id || place.googlePlaceId,
    googlePlaceId: place.googlePlaceId || place.place_id,
    name: place.name,
    address: place.address || place.formatted_address,
    latitude: place.latitude || place.geometry?.location?.lat,
    longitude: place.longitude || place.geometry?.location?.lng,
    placeType: place.placeType || place.type,
    rating: place.rating,
    priceLevel: place.priceLevel || place.price_level,
    phoneNumber: place.phoneNumber || place.formatted_phone_number,
    website: place.website,
    businessStatus: place.businessStatus || place.business_status,
    openingHours: place.openingHours || place.opening_hours,
    photos: place.photos || [],
    distance: place.distance,
    formattedDistance: place.formattedDistance,
    createdAt: place.createdAt,
    updatedAt: place.updatedAt
  };
};

const formatLocation = (location) => {
  if (!location) return null;

  return {
    latitude: parseFloat(location.latitude),
    longitude: parseFloat(location.longitude),
    address: location.address,
    city: location.city,
    country: location.country
  };
};

// Distance calculations
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

const formatDistance = (distanceInMeters) => {
  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)}m`;
  } else {
    return `${(distanceInMeters / 1000).toFixed(1)}km`;
  }
};

const sortByDistance = (places, userLat, userLng) => {
  return places.map(place => {
    const distance = calculateDistance(userLat, userLng, place.latitude, place.longitude);
    return {
      ...place,
      distance: Math.round(distance),
      formattedDistance: formatDistance(distance)
    };
  }).sort((a, b) => a.distance - b.distance);
};

// Time helpers
const timeAgo = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };

  for (const [unit, seconds] of Object.entries(intervals)) {
    const interval = Math.floor(diffInSeconds / seconds);
    if (interval >= 1) {
      return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
    }
  }

  return 'Just now';
};

const formatDate = (date, format = 'en-US') => {
  if (!date) return null;

  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };

  return new Date(date).toLocaleDateString(format, options);
};

// String helpers
const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};

const slugify = (text) => {
  if (!text) return '';

  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

// Array helpers
const removeDuplicates = (array, key = null) => {
  if (!Array.isArray(array)) return [];

  if (key) {
    const seen = new Set();
    return array.filter(item => {
      const val = item[key];
      if (seen.has(val)) return false;
      seen.add(val);
      return true;
    });
  }

  return [...new Set(array)];
};

const groupBy = (array, key) => {
  if (!Array.isArray(array)) return {};

  return array.reduce((groups, item) => {
    const group = item[key];
    groups[group] = groups[group] || [];
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

// OPTIMIZED: Cache key generators with improved precision for cost efficiency
const generateCacheKey = (...parts) => {
  return parts
    .filter(part => part !== null && part !== undefined)
    .map(part => String(part))
    .join(':');
};

// FIXED: Cache key with proper rounding for cache hits
const generateLocationCacheKey = (latitude, longitude, radius, type) => {
  // Round to ~100m precision to increase cache hits
  const roundedLat = Math.round(latitude * 100) / 100; // 2 decimals = ~1km precision
  const roundedLng = Math.round(longitude * 100) / 100;
  const roundedRadius = Math.ceil(radius / 500) * 500; // Round radius to 500m increments

  return `nearby:${roundedLat}:${roundedLng}:${roundedRadius}:${type}`;
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

// API Utils object for Google Places service
const apiUtils = {
  // Format place data for display
  formatPlace(place) {
    return formatPlace(place);
  },

  // Calculate distance between two points (Haversine formula)
  calculateDistance(lat1, lng1, lat2, lng2) {
    return calculateDistance(lat1, lng1, lat2, lng2);
  },

  // Format distance for display
  formatDistance(distanceInMeters) {
    return formatDistance(distanceInMeters);
  },

  // Get place type emoji
  getTypeEmoji(type) {
    const typeEmojis = {
      cafe: '☕',
      bar: '🍺',
      pub: '🍺',
      restaurant: '🍽',
      bakery: '🥐',
      default: '📍'
    };
    return typeEmojis[type] || typeEmojis.default;
  },

  // Get rating stars
  getRatingStars(rating) {
    if (!rating) return '';

    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return '★'.repeat(fullStars) +
           (hasHalfStar ? '☆' : '') +
           '☆'.repeat(emptyStars);
  },

  // Format opening hours for Italian context
  formatOpeningHours(openingHours) {
    if (!openingHours) return null;

    const formatted = {
      openNow: openingHours.open_now || openingHours.openNow || false,
      periods: openingHours.periods || [],
      weekdayText: openingHours.weekday_text || openingHours.weekdayText || []
    };

    // Translate to Italian if needed
    if (formatted.weekdayText && formatted.weekdayText.length > 0) {
      formatted.weekdayTextItalian = formatted.weekdayText.map(text => {
        return text
          .replace(/Monday/g, 'Lunedì')
          .replace(/Tuesday/g, 'Martedì')
          .replace(/Wednesday/g, 'Mercoledì')
          .replace(/Thursday/g, 'Giovedì')
          .replace(/Friday/g, 'Venerdì')
          .replace(/Saturday/g, 'Sabato')
          .replace(/Sunday/g, 'Domenica')
          .replace(/Closed/g, 'Chiuso')
          .replace(/Open 24 hours/g, 'Aperto 24 ore');
      });
    }

    return formatted;
  }
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

  // Cache helpers (OPTIMIZED)
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
  logError,

  // API Utils for Google Places service
  apiUtils
};