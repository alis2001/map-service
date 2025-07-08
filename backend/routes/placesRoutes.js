// routes/placesRoutes.js
// Location: /backend/routes/placesRoutes.js

const express = require('express');
const rateLimit = require('express-rate-limit');
const placesController = require('../controllers/placesController');
const { 
  validatePlacesSearch,
  validateTextSearch,
  validateCoordinates,
  validatePagination,
  sanitize,
  parseNumbers
} = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();

// Rate limiting for places API
const placesLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window
  message: {
    success: false,
    error: {
      message: 'Too many places API requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  handler: (req, res, next, options) => {
    logger.warn('Rate limit exceeded for places API', {
      ip: req.ip,
      endpoint: req.originalUrl,
      userAgent: req.get('User-Agent')
    });
    res.status(options.statusCode).json(options.message);
  }
});

// Apply rate limiting to all routes
router.use(placesLimiter);

// Apply common middleware
router.use(sanitize);
router.use(parseNumbers(['latitude', 'longitude', 'radius', 'limit', 'page']));

// Logging middleware for places API
router.use((req, res, next) => {
  logger.info('Places API Request', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method === 'POST' ? req.body : undefined,
    query: req.query
  });
  next();
});

// Routes

/**
 * @route   GET /api/v1/places/nearby
 * @desc    Get nearby coffee shops and bars
 * @access  Public (no auth needed - handled by main app)
 * @params  latitude, longitude, radius?, type?, limit?
 */
router.get('/nearby', 
  validatePlacesSearch,
  placesController.getNearbyPlaces
);

/**
 * @route   GET /api/v1/places/search
 * @desc    Search places by text query
 * @access  Public
 * @params  query, latitude?, longitude?, limit?
 */
router.get('/search',
  validateTextSearch,
  placesController.searchPlaces
);

/**
 * @route   GET /api/v1/places/:placeId
 * @desc    Get detailed information about a specific place
 * @access  Public
 * @params  placeId (Google Place ID)
 */
router.get('/:placeId',
  placesController.getPlaceDetails
);

/**
 * @route   GET /api/v1/places/popular/:type
 * @desc    Get popular places by type (cafe, bar, restaurant)
 * @access  Public
 * @params  type, limit?, minRating?
 */
router.get('/popular/:type',
  validatePagination,
  placesController.getPopularPlaces
);

/**
 * @route   GET /api/v1/places/categories/stats
 * @desc    Get statistics about places by category
 * @access  Public
 */
router.get('/categories/stats',
  placesController.getPlacesStatistics
);

/**
 * @route   POST /api/v1/places/batch-search
 * @desc    Search multiple locations in a single request
 * @access  Public
 * @body    { locations: [{ latitude, longitude, radius?, type? }] }
 */
router.post('/batch-search',
  placesController.batchSearch
);

/**
 * @route   GET /api/v1/places/within-bounds
 * @desc    Get places within geographic bounds
 * @access  Public
 * @params  northLat, southLat, eastLng, westLng, type?, limit?
 */
router.get('/within-bounds',
  placesController.getPlacesWithinBounds
);

/**
 * @route   GET /api/v1/places/photos/:placeId
 * @desc    Get photo URLs for a place
 * @access  Public
 * @params  placeId, size? (thumbnail, medium, large)
 */
router.get('/photos/:placeId',
  placesController.getPlacePhotos
);

/**
 * @route   GET /api/v1/places/health
 * @desc    Health check for places service
 * @access  Public
 */
router.get('/health',
  placesController.healthCheck
);

// Error handling middleware specific to places routes
router.use((error, req, res, next) => {
  logger.error('Places API Error', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    body: req.body,
    query: req.query
  });

  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.message
      }
    });
  }

  if (error.message.includes('Google Places API')) {
    return res.status(503).json({
      success: false,
      error: {
        message: 'External service temporarily unavailable',
        code: 'SERVICE_UNAVAILABLE'
      }
    });
  }

  if (error.message.includes('rate limit') || error.message.includes('quota')) {
    return res.status(429).json({
      success: false,
      error: {
        message: 'API rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED'
      }
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }
  });
});

module.exports = router;