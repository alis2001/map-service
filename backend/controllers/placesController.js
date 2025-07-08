// controllers/placesController.js
// Location: /backend/controllers/placesController.js

const googlePlacesService = require('../services/googlePlacesService');
const redisService = require('../services/redisService');
const logger = require('../utils/logger');
const { 
  successResponse, 
  errorResponse, 
  paginatedResponse,
  asyncHandler,
  calculateDistance,
  formatDistance 
} = require('../utils/helpers');
const { 
  isValidLatitude,
  isValidLongitude,
  isValidPlaceType,
  isValidGooglePlaceId 
} = require('../utils/validators');

class PlacesController {
  // Get nearby coffee shops and bars
  getNearbyPlaces = asyncHandler(async (req, res) => {
    const { latitude, longitude, radius = 1500, type = 'cafe', limit = 20 } = req.query;

    try {
      // Validate coordinates
      if (!isValidLatitude(parseFloat(latitude)) || !isValidLongitude(parseFloat(longitude))) {
        return errorResponse(res, 'Invalid coordinates provided', 400, 'INVALID_COORDINATES');
      }

      // Validate place type
      if (!isValidPlaceType(type)) {
        return errorResponse(res, 'Invalid place type. Must be: cafe, bar, or restaurant', 400, 'INVALID_PLACE_TYPE');
      }

      // Validate radius
      const searchRadius = parseInt(radius);
      if (searchRadius < 100 || searchRadius > 50000) {
        return errorResponse(res, 'Radius must be between 100 and 50000 meters', 400, 'INVALID_RADIUS');
      }

      // Validate limit
      const searchLimit = parseInt(limit);
      if (searchLimit < 1 || searchLimit > 50) {
        return errorResponse(res, 'Limit must be between 1 and 50', 400, 'INVALID_LIMIT');
      }

      const userLocation = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      };

      // Search for nearby places
      const result = await googlePlacesService.searchNearby(
        userLocation.latitude,
        userLocation.longitude,
        {
          type,
          radius: searchRadius,
          limit: searchLimit,
          userLocation
        }
      );

      logger.info('Nearby places search completed', {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        type,
        radius: searchRadius,
        resultCount: result.count
      });

      return successResponse(res, result, `Found ${result.count} nearby ${type}s`);

    } catch (error) {
      logger.error('Nearby places search failed', {
        latitude,
        longitude,
        type,
        radius,
        error: error.message
      });

      if (error.message.includes('Google Places API')) {
        return errorResponse(res, 'Places service temporarily unavailable', 503, 'SERVICE_UNAVAILABLE');
      }

      return errorResponse(res, 'Failed to search nearby places', 500, 'SEARCH_ERROR');
    }
  });

  // Search places by text query
  searchPlaces = asyncHandler(async (req, res) => {
    const { query, latitude, longitude, limit = 20 } = req.query;

    try {
      // Validate query
      if (!query || query.trim().length < 2) {
        return errorResponse(res, 'Search query must be at least 2 characters', 400, 'INVALID_QUERY');
      }

      if (query.length > 200) {
        return errorResponse(res, 'Search query must not exceed 200 characters', 400, 'QUERY_TOO_LONG');
      }

      // Validate coordinates if provided
      let userLocation = null;
      if (latitude && longitude) {
        if (!isValidLatitude(parseFloat(latitude)) || !isValidLongitude(parseFloat(longitude))) {
          return errorResponse(res, 'Invalid coordinates provided', 400, 'INVALID_COORDINATES');
        }
        userLocation = {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        };
      }

      // Validate limit
      const searchLimit = parseInt(limit);
      if (searchLimit < 1 || searchLimit > 50) {
        return errorResponse(res, 'Limit must be between 1 and 50', 400, 'INVALID_LIMIT');
      }

      // Search places
      const result = await googlePlacesService.searchByText(query.trim(), {
        latitude: userLocation?.latitude,
        longitude: userLocation?.longitude,
        limit: searchLimit,
        userLocation
      });

      logger.info('Text search completed', {
        query: query.trim(),
        latitude: userLocation?.latitude,
        longitude: userLocation?.longitude,
        resultCount: result.count
      });

      return successResponse(res, result, `Found ${result.count} places for "${query}"`);

    } catch (error) {
      logger.error('Text search failed', {
        query,
        latitude,
        longitude,
        error: error.message
      });

      if (error.message.includes('Google Places API')) {
        return errorResponse(res, 'Places service temporarily unavailable', 503, 'SERVICE_UNAVAILABLE');
      }

      return errorResponse(res, 'Failed to search places', 500, 'SEARCH_ERROR');
    }
  });

  // Get detailed information about a specific place
  getPlaceDetails = asyncHandler(async (req, res) => {
    const { placeId } = req.params;
    const { latitude, longitude } = req.query;

    try {
      // Validate place ID
      if (!placeId || !isValidGooglePlaceId(placeId)) {
        return errorResponse(res, 'Invalid Google Place ID', 400, 'INVALID_PLACE_ID');
      }

      // Validate user location if provided
      let userLocation = null;
      if (latitude && longitude) {
        if (!isValidLatitude(parseFloat(latitude)) || !isValidLongitude(parseFloat(longitude))) {
          return errorResponse(res, 'Invalid coordinates provided', 400, 'INVALID_COORDINATES');
        }
        userLocation = {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        };
      }

      // Get place details
      const place = await googlePlacesService.getPlaceById(placeId, {
        userLocation,
        includeReviews: true
      });

      if (!place) {
        return errorResponse(res, 'Place not found', 404, 'PLACE_NOT_FOUND');
      }

      logger.info('Place details retrieved', {
        placeId,
        placeName: place.name,
        userLocation: userLocation ? 'provided' : 'not provided'
      });

      return successResponse(res, place, 'Place details retrieved successfully');

    } catch (error) {
      logger.error('Failed to get place details', {
        placeId,
        error: error.message
      });

      if (error.message.includes('Google Places API')) {
        return errorResponse(res, 'Places service temporarily unavailable', 503, 'SERVICE_UNAVAILABLE');
      }

      return errorResponse(res, 'Failed to get place details', 500, 'PLACE_DETAILS_ERROR');
    }
  });

  // Get popular places by type
  getPopularPlaces = asyncHandler(async (req, res) => {
    const { type } = req.params;
    const { limit = 10, minRating = 4.0, latitude, longitude } = req.query;

    try {
      // Validate place type
      if (!isValidPlaceType(type)) {
        return errorResponse(res, 'Invalid place type. Must be: cafe, bar, or restaurant', 400, 'INVALID_PLACE_TYPE');
      }

      // Validate limit
      const searchLimit = parseInt(limit);
      if (searchLimit < 1 || searchLimit > 50) {
        return errorResponse(res, 'Limit must be between 1 and 50', 400, 'INVALID_LIMIT');
      }

      // Validate min rating
      const minimumRating = parseFloat(minRating);
      if (minimumRating < 1 || minimumRating > 5) {
        return errorResponse(res, 'Minimum rating must be between 1 and 5', 400, 'INVALID_RATING');
      }

      // Validate user location if provided
      let userLocation = null;
      if (latitude && longitude) {
        if (!isValidLatitude(parseFloat(latitude)) || !isValidLongitude(parseFloat(longitude))) {
          return errorResponse(res, 'Invalid coordinates provided', 400, 'INVALID_COORDINATES');
        }
        userLocation = {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        };
      }

      // Get popular places
      const result = await googlePlacesService.getPopularPlaces(type, {
        limit: searchLimit,
        userLocation,
        minRating: minimumRating
      });

      logger.info('Popular places retrieved', {
        type,
        limit: searchLimit,
        minRating: minimumRating,
        resultCount: result.count
      });

      return successResponse(res, result, `Found ${result.count} popular ${type}s`);

    } catch (error) {
      logger.error('Failed to get popular places', {
        type,
        error: error.message
      });

      return errorResponse(res, 'Failed to get popular places', 500, 'POPULAR_PLACES_ERROR');
    }
  });

  // Get places statistics
  getPlacesStatistics = asyncHandler(async (req, res) => {
    try {
      const stats = await googlePlacesService.getPlacesStatistics();

      logger.info('Places statistics retrieved', {
        totalPlaces: stats.totalPlaces
      });

      return successResponse(res, stats, 'Places statistics retrieved successfully');

    } catch (error) {
      logger.error('Failed to get places statistics', {
        error: error.message
      });

      return errorResponse(res, 'Failed to get places statistics', 500, 'STATS_ERROR');
    }
  });

  // Batch search multiple locations
  batchSearch = asyncHandler(async (req, res) => {
    const { locations } = req.body;

    try {
      // Validate input
      if (!locations || !Array.isArray(locations)) {
        return errorResponse(res, 'Locations must be an array', 400, 'INVALID_LOCATIONS');
      }

      if (locations.length === 0) {
        return errorResponse(res, 'At least one location is required', 400, 'EMPTY_LOCATIONS');
      }

      if (locations.length > 10) {
        return errorResponse(res, 'Maximum 10 locations allowed per batch', 400, 'TOO_MANY_LOCATIONS');
      }

      // Validate each location
      for (let i = 0; i < locations.length; i++) {
        const location = locations[i];
        
        if (!location.latitude || !location.longitude) {
          return errorResponse(res, `Location ${i + 1}: latitude and longitude are required`, 400, 'MISSING_COORDINATES');
        }

        if (!isValidLatitude(location.latitude) || !isValidLongitude(location.longitude)) {
          return errorResponse(res, `Location ${i + 1}: invalid coordinates`, 400, 'INVALID_COORDINATES');
        }

        // Set defaults
        location.radius = location.radius || 1500;
        location.type = location.type || 'cafe';
        location.limit = location.limit || 10;
      }

      // Process batch search
      const results = [];
      
      for (let i = 0; i < locations.length; i++) {
        const location = locations[i];
        
        try {
          const result = await googlePlacesService.searchNearby(
            location.latitude,
            location.longitude,
            {
              type: location.type,
              radius: location.radius,
              limit: location.limit,
              userLocation: {
                latitude: location.latitude,
                longitude: location.longitude
              }
            }
          );

          results.push({
            location: {
              latitude: location.latitude,
              longitude: location.longitude,
              radius: location.radius,
              type: location.type
            },
            success: true,
            places: result.places,
            count: result.count
          });

        } catch (error) {
          results.push({
            location: {
              latitude: location.latitude,
              longitude: location.longitude,
              radius: location.radius,
              type: location.type
            },
            success: false,
            error: error.message,
            count: 0
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const totalPlaces = results.reduce((sum, r) => sum + r.count, 0);

      logger.info('Batch search completed', {
        totalLocations: locations.length,
        successfulSearches: successCount,
        totalPlacesFound: totalPlaces
      });

      return successResponse(res, {
        results,
        summary: {
          totalLocations: locations.length,
          successfulSearches: successCount,
          failedSearches: locations.length - successCount,
          totalPlacesFound: totalPlaces
        }
      }, 'Batch search completed');

    } catch (error) {
      logger.error('Batch search failed', {
        error: error.message,
        locationsCount: locations?.length
      });

      return errorResponse(res, 'Batch search failed', 500, 'BATCH_SEARCH_ERROR');
    }
  });

  // Get places within geographic bounds
  getPlacesWithinBounds = asyncHandler(async (req, res) => {
    const { northLat, southLat, eastLng, westLng, type = 'cafe', limit = 50 } = req.query;

    try {
      // Validate bounds
      const north = parseFloat(northLat);
      const south = parseFloat(southLat);
      const east = parseFloat(eastLng);
      const west = parseFloat(westLng);

      if (!isValidLatitude(north) || !isValidLatitude(south) || 
          !isValidLongitude(east) || !isValidLongitude(west)) {
        return errorResponse(res, 'Invalid geographic bounds', 400, 'INVALID_BOUNDS');
      }

      if (north <= south) {
        return errorResponse(res, 'North latitude must be greater than south latitude', 400, 'INVALID_LAT_BOUNDS');
      }

      if (east <= west) {
        return errorResponse(res, 'East longitude must be greater than west longitude', 400, 'INVALID_LNG_BOUNDS');
      }

      // Validate place type
      if (!isValidPlaceType(type)) {
        return errorResponse(res, 'Invalid place type. Must be: cafe, bar, or restaurant', 400, 'INVALID_PLACE_TYPE');
      }

      // For bounds search, we'll search the center point with a calculated radius
      const centerLat = (north + south) / 2;
      const centerLng = (east + west) / 2;
      
      // Calculate approximate radius to cover the bounds
      const radius = Math.min(
        calculateDistance(centerLat, centerLng, north, east) * 1.2, // Add 20% buffer
        25000 // Max 25km radius
      );

      const result = await googlePlacesService.searchNearby(centerLat, centerLng, {
        type,
        radius: Math.round(radius),
        limit: parseInt(limit),
        userLocation: { latitude: centerLat, longitude: centerLng }
      });

      // Filter results to only include places actually within bounds
      const placesWithinBounds = result.places.filter(place => {
        return place.location.latitude >= south && 
               place.location.latitude <= north &&
               place.location.longitude >= west && 
               place.location.longitude <= east;
      });

      logger.info('Places within bounds retrieved', {
        bounds: { north, south, east, west },
        type,
        centerPoint: { centerLat, centerLng },
        searchRadius: Math.round(radius),
        totalFound: result.count,
        withinBounds: placesWithinBounds.length
      });

      return successResponse(res, {
        places: placesWithinBounds,
        count: placesWithinBounds.length,
        bounds: { north, south, east, west },
        searchCenter: { latitude: centerLat, longitude: centerLng }
      }, `Found ${placesWithinBounds.length} ${type}s within bounds`);

    } catch (error) {
      logger.error('Failed to get places within bounds', {
        bounds: { northLat, southLat, eastLng, westLng },
        error: error.message
      });

      return errorResponse(res, 'Failed to get places within bounds', 500, 'BOUNDS_SEARCH_ERROR');
    }
  });

  // Get photo URLs for a place
  getPlacePhotos = asyncHandler(async (req, res) => {
    const { placeId } = req.params;
    const { size = 'medium' } = req.query;

    try {
      // Validate place ID
      if (!placeId || !isValidGooglePlaceId(placeId)) {
        return errorResponse(res, 'Invalid Google Place ID', 400, 'INVALID_PLACE_ID');
      }

      // Validate size
      const validSizes = ['thumbnail', 'medium', 'large'];
      if (!validSizes.includes(size)) {
        return errorResponse(res, 'Invalid size. Must be: thumbnail, medium, or large', 400, 'INVALID_SIZE');
      }

      // Get place details with photos
      const place = await googlePlacesService.getPlaceById(placeId, {
        includeReviews: false
      });

      if (!place) {
        return errorResponse(res, 'Place not found', 404, 'PLACE_NOT_FOUND');
      }

      const photos = place.photoUrls || {};
      const requestedPhotos = photos[size] || [];

      logger.info('Place photos retrieved', {
        placeId,
        placeName: place.name,
        size,
        photoCount: requestedPhotos.length
      });

      return successResponse(res, {
        placeId,
        placeName: place.name,
        size,
        photos: requestedPhotos,
        count: requestedPhotos.length,
        availableSizes: Object.keys(photos)
      }, `Retrieved ${requestedPhotos.length} ${size} photos`);

    } catch (error) {
      logger.error('Failed to get place photos', {
        placeId,
        size,
        error: error.message
      });

      return errorResponse(res, 'Failed to get place photos', 500, 'PHOTOS_ERROR');
    }
  });

  // Health check for places service
  healthCheck = asyncHandler(async (req, res) => {
    try {
      const googlePlacesHealth = await googlePlacesService.healthCheck();
      const redisHealth = await redisService.healthCheck();

      const isHealthy = googlePlacesHealth.status === 'healthy' && 
                       redisHealth.status === 'healthy';

      const healthStatus = {
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        services: {
          googlePlaces: googlePlacesHealth,
          redis: redisHealth
        },
        version: '1.0.0',
        uptime: process.uptime()
      };

      const statusCode = isHealthy ? 200 : 503;

      return res.status(statusCode).json({
        success: isHealthy,
        data: healthStatus,
        message: isHealthy ? 'All services healthy' : 'Some services degraded'
      });

    } catch (error) {
      logger.error('Health check failed', {
        error: error.message
      });

      return errorResponse(res, 'Health check failed', 503, 'HEALTH_CHECK_ERROR');
    }
  });
}

// Create and export controller instance
const placesController = new PlacesController();

module.exports = placesController