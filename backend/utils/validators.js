// utils/validators.js - COMPLETE UPDATED VERSION - Removed Pub Support
// Location: /backend/utils/validators.js

const logger = require('./logger');

// Regular expressions for validation
const REGEX_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  phone: /^\+?[1-9]\d{1,14}$/,
  username: /^[a-zA-Z0-9_]{3,30}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  googlePlaceId: /^[A-Za-z0-9_-]+$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/
};

// Coordinate validation constants
const COORD_LIMITS = {
  latitude: { min: -90, max: 90 },
  longitude: { min: -180, max: 180 }
};

// Business validation constants
const BUSINESS_LIMITS = {
  searchRadius: { min: 100, max: 50000 }, // meters
  rating: { min: 1, max: 5 },
  priceLevel: { min: 0, max: 4 },
  reviewLength: { min: 1, max: 1000 },
  nameLength: { min: 1, max: 200 },
  addressLength: { min: 1, max: 500 }
};

// Basic validation functions
const isString = (value) => typeof value === 'string';
const isNumber = (value) => typeof value === 'number' && !isNaN(value);
const isBoolean = (value) => typeof value === 'boolean';
const isArray = (value) => Array.isArray(value);
const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);
const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (isString(value)) return value.trim().length === 0;
  if (isArray(value)) return value.length === 0;
  if (isObject(value)) return Object.keys(value).length === 0;
  return false;
};

// String validation functions
const isValidEmail = (email) => {
  return isString(email) && REGEX_PATTERNS.email.test(email.toLowerCase());
};

const isValidPassword = (password) => {
  return isString(password) && REGEX_PATTERNS.password.test(password);
};

const isValidPhone = (phone) => {
  return isString(phone) && REGEX_PATTERNS.phone.test(phone);
};

const isValidUsername = (username) => {
  return isString(username) && REGEX_PATTERNS.username.test(username);
};

const isValidUUID = (uuid) => {
  return isString(uuid) && REGEX_PATTERNS.uuid.test(uuid);
};

const isValidGooglePlaceId = (placeId) => {
  return isString(placeId) && REGEX_PATTERNS.googlePlaceId.test(placeId) && placeId.length >= 10;
};

const isValidUrl = (url) => {
  return isString(url) && REGEX_PATTERNS.url.test(url);
};

// Number validation functions
const isValidLatitude = (lat) => {
  return isNumber(lat) && lat >= COORD_LIMITS.latitude.min && lat <= COORD_LIMITS.latitude.max;
};

const isValidLongitude = (lng) => {
  return isNumber(lng) && lng >= COORD_LIMITS.longitude.min && lng <= COORD_LIMITS.longitude.max;
};

const isValidCoordinates = (lat, lng) => {
  return isValidLatitude(lat) && isValidLongitude(lng);
};

const isValidRadius = (radius) => {
  return isNumber(radius) && 
         radius >= BUSINESS_LIMITS.searchRadius.min && 
         radius <= BUSINESS_LIMITS.searchRadius.max;
};

const isValidRating = (rating) => {
  return isNumber(rating) && 
         Number.isInteger(rating) && 
         rating >= BUSINESS_LIMITS.rating.min && 
         rating <= BUSINESS_LIMITS.rating.max;
};

const isValidPriceLevel = (priceLevel) => {
  return isNumber(priceLevel) && 
         Number.isInteger(priceLevel) && 
         priceLevel >= BUSINESS_LIMITS.priceLevel.min && 
         priceLevel <= BUSINESS_LIMITS.priceLevel.max;
};

// UPDATED: Business logic validation (removed pub support)
const isValidPlaceType = (type) => {
  const validTypes = ['cafe', 'restaurant']; // REMOVED 'pub'
  return isString(type) && validTypes.includes(type.toLowerCase());
};

const isValidSortOrder = (order) => {
  const validOrders = ['asc', 'desc'];
  return isString(order) && validOrders.includes(order.toLowerCase());
};

const isValidSortField = (field) => {
  const validFields = ['createdAt', 'updatedAt', 'name', 'rating', 'distance', 'priceLevel'];
  return isString(field) && validFields.includes(field);
};

// Date validation functions
const isValidDate = (date) => {
  if (date instanceof Date) {
    return !isNaN(date.getTime());
  }
  if (isString(date)) {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }
  return false;
};

const isValidTimestamp = (timestamp) => {
  return isNumber(timestamp) && timestamp > 0 && timestamp <= Date.now() + 86400000; // Allow up to 1 day in future
};

// Complex validation functions
const validateLocationData = (locationData) => {
  const errors = [];
  
  if (!isObject(locationData)) {
    errors.push('Location data must be an object');
    return { isValid: false, errors };
  }
  
  const { latitude, longitude, accuracy, address, city, country } = locationData;
  
  // Required fields
  if (!isValidLatitude(latitude)) {
    errors.push('Invalid latitude: must be a number between -90 and 90');
  }
  
  if (!isValidLongitude(longitude)) {
    errors.push('Invalid longitude: must be a number between -180 and 180');
  }
  
  // Optional fields
  if (accuracy !== undefined && (!isNumber(accuracy) || accuracy < 0 || accuracy > 10000)) {
    errors.push('Invalid accuracy: must be a number between 0 and 10000');
  }
  
  if (address !== undefined && (!isString(address) || address.length > BUSINESS_LIMITS.addressLength.max)) {
    errors.push(`Invalid address: must be a string with max ${BUSINESS_LIMITS.addressLength.max} characters`);
  }
  
  if (city !== undefined && (!isString(city) || city.length > 100)) {
    errors.push('Invalid city: must be a string with max 100 characters');
  }
  
  if (country !== undefined && (!isString(country) || country.length > 100)) {
    errors.push('Invalid country: must be a string with max 100 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateUserData = (userData) => {
  const errors = [];
  
  if (!isObject(userData)) {
    errors.push('User data must be an object');
    return { isValid: false, errors };
  }
  
  const { email, password, firstName, lastName, username } = userData;
  
  // Email validation
  if (email !== undefined && !isValidEmail(email)) {
    errors.push('Invalid email format');
  }
  
  // Password validation
  if (password !== undefined && !isValidPassword(password)) {
    errors.push('Invalid password: must be at least 8 characters with uppercase, lowercase, and number');
  }
  
  // Name validations
  if (firstName !== undefined && (!isString(firstName) || firstName.length > 50)) {
    errors.push('Invalid first name: must be a string with max 50 characters');
  }
  
  if (lastName !== undefined && (!isString(lastName) || lastName.length > 50)) {
    errors.push('Invalid last name: must be a string with max 50 characters');
  }
  
  // Username validation
  if (username !== undefined && !isValidUsername(username)) {
    errors.push('Invalid username: must be 3-30 characters, alphanumeric and underscore only');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// UPDATED: Search params validation (removed pub support)
const validateSearchParams = (searchParams) => {
  const errors = [];
  
  if (!isObject(searchParams)) {
    errors.push('Search parameters must be an object');
    return { isValid: false, errors };
  }
  
  const { latitude, longitude, radius, type, limit, query } = searchParams;
  
  // Coordinates (required for location-based search)
  if (latitude !== undefined && !isValidLatitude(latitude)) {
    errors.push('Invalid latitude');
  }
  
  if (longitude !== undefined && !isValidLongitude(longitude)) {
    errors.push('Invalid longitude');
  }
  
  // Optional parameters
  if (radius !== undefined && !isValidRadius(radius)) {
    errors.push(`Invalid radius: must be between ${BUSINESS_LIMITS.searchRadius.min} and ${BUSINESS_LIMITS.searchRadius.max} meters`);
  }
  
  // UPDATED: Place type validation (removed pub)
  if (type !== undefined && !isValidPlaceType(type)) {
    errors.push('Invalid place type: must be cafe or restaurant'); // REMOVED 'or pub'
  }
  
  if (limit !== undefined && (!isNumber(limit) || !Number.isInteger(limit) || limit < 1 || limit > 50)) {
    errors.push('Invalid limit: must be an integer between 1 and 50');
  }
  
  if (query !== undefined && (!isString(query) || query.length < 2 || query.length > 200)) {
    errors.push('Invalid query: must be a string between 2 and 200 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Data sanitization functions
const sanitizeString = (str, maxLength = null) => {
  if (!isString(str)) return str;
  
  let sanitized = str
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim(); // Remove leading/trailing whitespace
  
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
};

const sanitizeEmail = (email) => {
  return isString(email) ? email.toLowerCase().trim() : email;
};

const sanitizeCoordinates = (lat, lng) => {
  return {
    latitude: isNumber(lat) ? Math.round(lat * 1000000) / 1000000 : lat, // 6 decimal places
    longitude: isNumber(lng) ? Math.round(lng * 1000000) / 1000000 : lng
  };
};

// Distance calculation (Haversine formula)
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  if (!isValidCoordinates(lat1, lng1) || !isValidCoordinates(lat2, lng2)) {
    return null;
  }
  
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance in meters
};

// Format validation results
const formatValidationResult = (isValid, errors = [], data = null) => {
  const result = { isValid, errors };
  if (data) result.data = data;
  return result;
};

// Validation error logging
const logValidationError = (context, errors, data = {}) => {
  logger.warn('Validation failed', {
    context,
    errors,
    data: JSON.stringify(data)
  });
};

module.exports = {
  // Basic validators
  isString,
  isNumber,
  isBoolean,
  isArray,
  isObject,
  isEmpty,
  
  // String validators
  isValidEmail,
  isValidPassword,
  isValidPhone,
  isValidUsername,
  isValidUUID,
  isValidGooglePlaceId,
  isValidUrl,
  
  // Number validators
  isValidLatitude,
  isValidLongitude,
  isValidCoordinates,
  isValidRadius,
  isValidRating,
  isValidPriceLevel,
  
  // Business validators (UPDATED: removed pub support)
  isValidPlaceType,
  isValidSortOrder,
  isValidSortField,
  
  // Date validators
  isValidDate,
  isValidTimestamp,
  
  // Complex validators
  validateLocationData,
  validateUserData,
  validateSearchParams,
  
  // Sanitizers
  sanitizeString,
  sanitizeEmail,
  sanitizeCoordinates,
  
  // Utilities
  calculateDistance,
  formatValidationResult,
  logValidationError,
  
  // Constants
  REGEX_PATTERNS,
  COORD_LIMITS,
  BUSINESS_LIMITS
};