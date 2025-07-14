// backend/routes/searchRoutes.js - SEARCH API ENDPOINTS
// Location: /backend/routes/searchRoutes.js

const express = require('express');
const rateLimit = require('express-rate-limit');
const searchService = require('../services/searchService');
const { 
  successResponse, 
  errorResponse,
  asyncHandler 
} = require('../utils/helpers');
const { sanitize } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();

// Rate limiting for search API
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, // 50 searches per minute per IP
  message: {
    success: false,
    error: {
      message: 'Too many search requests. Please try again later.',
      code: 'SEARCH_RATE_LIMIT'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

router.use(searchLimiter);
router.use(sanitize);

// Logging middleware
router.use((req, res, next) => {
  logger.info('Search API Request', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    query: req.query
  });
  next();
});

/**
 * @route   GET /api/v1/search/cities
 * @desc    Search Italian cities with autocomplete
 * @access  Public
 * @params  q (query), limit?
 */
router.get('/cities', asyncHandler(async (req, res) => {
  const { q: query, limit = 10 } = req.query;

  if (!query || query.length < 2) {
    return errorResponse(res, 'Query must be at least 2 characters', 400, 'INVALID_QUERY');
  }

  if (limit > 50) {
    return errorResponse(res, 'Limit cannot exceed 50', 400, 'LIMIT_EXCEEDED');
  }

  console.log(`🔍 City search: "${query}"`);

  const results = await searchService.searchCities(query, parseInt(limit));

  return successResponse(res, {
    query,
    results,
    count: results.length
  }, `Found ${results.length} cities`);
}));

/**
 * @route   GET /api/v1/search/places
 * @desc    Search places in a specific city
 * @access  Public
 * @params  q (query), lat, lng, type?, limit?
 */
router.get('/places', asyncHandler(async (req, res) => {
  const { 
    q: query, 
    lat, 
    lng, 
    type = 'all', 
    limit = 20 
  } = req.query;

  // Validate required parameters
  if (!query || query.length < 2) {
    return errorResponse(res, 'Query must be at least 2 characters', 400, 'INVALID_QUERY');
  }

  if (!lat || !lng) {
    return errorResponse(res, 'City coordinates (lat, lng) are required', 400, 'MISSING_COORDINATES');
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    return errorResponse(res, 'Invalid coordinates provided', 400, 'INVALID_COORDINATES');
  }

  if (latitude < 35 || latitude > 47 || longitude < 6 || longitude > 19) {
    return errorResponse(res, 'Coordinates must be within Italy', 400, 'COORDINATES_OUT_OF_BOUNDS');
  }

  console.log(`🏪 Place search: "${query}" at ${latitude}, ${longitude}`);

  const results = await searchService.searchPlacesInCity(
    { lat: latitude, lng: longitude },
    query,
    type,
    parseInt(limit)
  );

  if (results.error) {
    return errorResponse(res, results.error, 500, 'SEARCH_ERROR');
  }

  return successResponse(res, results, `Found ${results.count} places`);
}));

/**
 * @route   GET /api/v1/search/suggestions
 * @desc    Get popular search suggestions for a city
 * @access  Public
 * @params  cityId, type?, limit?
 */
router.get('/suggestions', asyncHandler(async (req, res) => {
  const { 
    cityId, 
    type = 'all', 
    limit = 10 
  } = req.query;

  if (!cityId) {
    return errorResponse(res, 'City ID is required', 400, 'MISSING_CITY_ID');
  }

  console.log(`💡 Getting suggestions for city: ${cityId}, type: ${type}`);

  const suggestions = await searchService.getPopularSearches(
    cityId, 
    type, 
    parseInt(limit)
  );

  return successResponse(res, {
    cityId,
    type,
    suggestions,
    count: suggestions.length
  }, `Found ${suggestions.length} suggestions`);
}));

/**
 * @route   GET /api/v1/search/health
 * @desc    Search service health check
 * @access  Public
 */
router.get('/health', asyncHandler(async (req, res) => {
  const health = await searchService.healthCheck();
  
  if (health.status === 'healthy') {
    return successResponse(res, health, 'Search service is healthy');
  } else {
    return errorResponse(res, 'Search service is not ready', 503, 'SERVICE_UNAVAILABLE');
  }
}));

/**
 * @route   POST /api/v1/search/initialize
 * @desc    Initialize search service (admin only)
 * @access  Public (in development)
 */
router.post('/initialize', asyncHandler(async (req, res) => {
  console.log('🔧 Manual search service initialization requested');
  
  try {
    await searchService.initialize();
    
    const health = await searchService.healthCheck();
    return successResponse(res, health, 'Search service initialized successfully');
    
  } catch (error) {
    logger.error('Search service initialization failed', { error: error.message });
    return errorResponse(res, 'Failed to initialize search service', 500, 'INITIALIZATION_ERROR');
  }
}));

// Error handling middleware
router.use((error, req, res, next) => {
  logger.error('Search API Error', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    query: req.query
  });

  if (error.name === 'ValidationError') {
    return errorResponse(res, 'Invalid search parameters', 400, 'VALIDATION_ERROR');
  }

  return errorResponse(res, 'Search service error', 500, 'INTERNAL_ERROR');
});

module.exports = router;