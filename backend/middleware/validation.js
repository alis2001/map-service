// middleware/validation.js
// Location: /backend/middleware/validation.js

const logger = require('../utils/logger');

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password validation regex (at least 8 chars, 1 uppercase, 1 lowercase, 1 number)
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;

// Phone number validation regex (international format)
const phoneRegex = /^\+?[1-9]\d{1,14}$/;

// Coordinate validation ranges
const COORD_RANGES = {
  latitude: { min: -90, max: 90 },
  longitude: { min: -180, max: 180 }
};

// Validation error response
const validationError = (res, message, field = null) => {
  const error = {
    success: false,
    error: {
      message,
      code: 'VALIDATION_ERROR',
      field
    }
  };
  
  return res.status(400).json(error);
};

// Generic field validation
const validateField = (value, fieldName, rules) => {
  const errors = [];
  
  // Required check
  if (rules.required && (value === undefined || value === null || value === '')) {
    errors.push(`${fieldName} is required`);
    return errors;
  }
  
  // Skip other validations if field is optional and empty
  if (!rules.required && (value === undefined || value === null || value === '')) {
    return errors;
  }
  
  // Type validation
  if (rules.type) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== rules.type) {
      errors.push(`${fieldName} must be of type ${rules.type}`);
    }
  }
  
  // String validations
  if (typeof value === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`${fieldName} must be at least ${rules.minLength} characters`);
    }
    
    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`${fieldName} must not exceed ${rules.maxLength} characters`);
    }
    
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(`${fieldName} format is invalid`);
    }
    
    if (rules.email && !emailRegex.test(value)) {
      errors.push(`${fieldName} must be a valid email address`);
    }
    
    if (rules.password && !passwordRegex.test(value)) {
      errors.push(`${fieldName} must contain at least 8 characters, 1 uppercase, 1 lowercase, and 1 number`);
    }
    
    if (rules.phone && !phoneRegex.test(value)) {
      errors.push(`${fieldName} must be a valid phone number`);
    }
  }
  
  // Number validations
  if (typeof value === 'number') {
    if (rules.min !== undefined && value < rules.min) {
      errors.push(`${fieldName} must be at least ${rules.min}`);
    }
    
    if (rules.max !== undefined && value > rules.max) {
      errors.push(`${fieldName} must not exceed ${rules.max}`);
    }
    
    if (rules.integer && !Number.isInteger(value)) {
      errors.push(`${fieldName} must be an integer`);
    }
  }
  
  // Array validations
  if (Array.isArray(value)) {
    if (rules.minItems && value.length < rules.minItems) {
      errors.push(`${fieldName} must contain at least ${rules.minItems} items`);
    }
    
    if (rules.maxItems && value.length > rules.maxItems) {
      errors.push(`${fieldName} must not contain more than ${rules.maxItems} items`);
    }
  }
  
  // Enum validation
  if (rules.enum && !rules.enum.includes(value)) {
    errors.push(`${fieldName} must be one of: ${rules.enum.join(', ')}`);
  }
  
  return errors;
};

// Create validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const errors = [];
    const data = { ...req.body, ...req.params, ...req.query };
    
    // Validate each field in schema
    for (const [fieldName, rules] of Object.entries(schema)) {
      const fieldErrors = validateField(data[fieldName], fieldName, rules);
      errors.push(...fieldErrors);
    }
    
    if (errors.length > 0) {
      logger.warn('Validation failed', {
        errors,
        endpoint: req.originalUrl,
        method: req.method,
        ip: req.ip
      });
      
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors
        }
      });
    }
    
    next();
  };
};

// Specific validation schemas (NO AUTH SCHEMAS)
const schemas = {
  // Location validation (for search coordinates)
  locationSearch: {
    latitude: {
      required: true,
      type: 'number',
      min: COORD_RANGES.latitude.min,
      max: COORD_RANGES.latitude.max
    },
    longitude: {
      required: true,
      type: 'number',
      min: COORD_RANGES.longitude.min,
      max: COORD_RANGES.longitude.max
    },
    accuracy: {
      required: false,
      type: 'number',
      min: 0,
      max: 10000
    }
  },
  
  // Places search validation
  placesSearch: {
    latitude: {
      required: true,
      type: 'number',
      min: COORD_RANGES.latitude.min,
      max: COORD_RANGES.latitude.max
    },
    longitude: {
      required: true,
      type: 'number',
      min: COORD_RANGES.longitude.min,
      max: COORD_RANGES.longitude.max
    },
    radius: {
      required: false,
      type: 'number',
      min: 100,
      max: 50000
    },
    type: {
      required: false,
      type: 'string',
      enum: ['cafe', 'bar', 'restaurant']
    },
    limit: {
      required: false,
      type: 'number',
      min: 1,
      max: 50,
      integer: true
    }
  },
  
  // Text search validation
  textSearch: {
    query: {
      required: true,
      type: 'string',
      minLength: 2,
      maxLength: 200
    },
    latitude: {
      required: false,
      type: 'number',
      min: COORD_RANGES.latitude.min,
      max: COORD_RANGES.latitude.max
    },
    longitude: {
      required: false,
      type: 'number',
      min: COORD_RANGES.longitude.min,
      max: COORD_RANGES.longitude.max
    }
  },
  
  // Place review validation (simplified - no user association)
  placeReview: {
    rating: {
      required: true,
      type: 'number',
      min: 1,
      max: 5,
      integer: true
    },
    comment: {
      required: false,
      type: 'string',
      maxLength: 1000
    }
  },
  
  // Pagination validation
  pagination: {
    page: {
      required: false,
      type: 'number',
      min: 1,
      integer: true
    },
    limit: {
      required: false,
      type: 'number',
      min: 1,
      max: 100,
      integer: true
    },
    sortBy: {
      required: false,
      type: 'string',
      enum: ['createdAt', 'updatedAt', 'name', 'rating', 'distance']
    },
    sortOrder: {
      required: false,
      type: 'string',
      enum: ['asc', 'desc']
    }
  }
};

// Coordinate validation middleware
const validateCoordinates = (req, res, next) => {
  const { latitude, longitude } = req.body;
  
  if (latitude === undefined || longitude === undefined) {
    return validationError(res, 'Latitude and longitude are required');
  }
  
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return validationError(res, 'Latitude and longitude must be numbers');
  }
  
  if (latitude < -90 || latitude > 90) {
    return validationError(res, 'Latitude must be between -90 and 90', 'latitude');
  }
  
  if (longitude < -180 || longitude > 180) {
    return validationError(res, 'Longitude must be between -180 and 180', 'longitude');
  }
  
  next();
};

// Sanitize input data
const sanitize = (req, res, next) => {
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    
    // Remove HTML tags and potentially dangerous characters
    return str
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>]/g, '') // Remove angle brackets
      .trim(); // Remove leading/trailing whitespace
  };
  
  const sanitizeObject = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    
    return sanitizeString(obj);
  };
  
  // Sanitize body, query, and params
  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  req.params = sanitizeObject(req.params);
  
  next();
};

// Convert string numbers to actual numbers
const parseNumbers = (fields) => {
  return (req, res, next) => {
    const parseValue = (value) => {
      if (typeof value === 'string' && !isNaN(value) && !isNaN(parseFloat(value))) {
        return parseFloat(value);
      }
      return value;
    };
    
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        req.body[field] = parseValue(req.body[field]);
      }
      if (req.query[field] !== undefined) {
        req.query[field] = parseValue(req.query[field]);
      }
      if (req.params[field] !== undefined) {
        req.params[field] = parseValue(req.params[field]);
      }
    });
    
    next();
  };
};

// Specific validation middleware functions (NO AUTH VALIDATORS)
const validateLocationSearch = validate(schemas.locationSearch);
const validatePlacesSearch = validate(schemas.placesSearch);
const validateTextSearch = validate(schemas.textSearch);
const validatePlaceReview = validate(schemas.placeReview);
const validatePagination = validate(schemas.pagination);

module.exports = {
  validate,
  schemas,
  validateField,
  validateCoordinates,
  sanitize,
  parseNumbers,
  validationError,
  
  // Pre-built validators (NO AUTH)
  validateLocationSearch,
  validatePlacesSearch,
  validateTextSearch,
  validatePlaceReview,
  validatePagination
};