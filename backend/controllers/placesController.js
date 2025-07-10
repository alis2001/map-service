// controllers/placesController.js - FIXED VERSION
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
  // FIXED: Get nearby coffee shops and bars with proper service integration
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

      // FIXED: Use the Google Places service correctly
      console.log('🔍 Searching for nearby places:', {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        type,
        radius: searchRadius,
        limit: searchLimit
      });

      // Around line 50-60, after getting the result, add this filtering:
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

      // ADDED: Filter results to match exactly what user requested
      const filteredPlaces = result.places.filter(place => {
        const placeType = place.type || place.placeType;
        
        if (type === 'restaurant') {
          // Only show restaurants when restaurant is selected
          return placeType === 'restaurant';
        } else if (type === 'cafe') {
          // Only show cafes/bars when cafe is selected (exclude restaurants)
          return placeType === 'cafe';
        }
        
        return true; // Default: show all
      });

      console.log(`🎯 FILTERED: ${result.places.length} -> ${filteredPlaces.length} places for type: ${type}`);

      const finalResult = {
        ...result,
        places: filteredPlaces,
        count: filteredPlaces.length
      };

      return successResponse(res, finalResult, `Found ${finalResult.count} nearby ${type}s`);

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

  // FIXED: Search places by text query with proper service integration
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

      console.log('🔍 Text search request:', {
        query: query.trim(),
        userLocation,
        limit: searchLimit
      });

      // FIXED: Use the Google Places service searchByText method
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

  // FIXED: Get detailed information about a specific place - NOW PROPERLY IMPLEMENTED
  // ENHANCED: Get detailed information about a specific place with real-time status
  // ENHANCED: Get detailed information about a specific place with better error handling
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

      console.log('📍 Getting place details with error handling:', {
        placeId,
        userLocation: userLocation ? 'provided' : 'not provided'
      });

      try {
        // Try to get place details from Google Places API
        const place = await googlePlacesService.getPlaceById(placeId, {
          includeReviews: true,
          userLocation
        });

        if (!place) {
          return errorResponse(res, 'Place not found', 404, 'PLACE_NOT_FOUND');
        }

        // Enhanced place data formatting
        const enhancedPlace = {
          ...place,
          emoji: getItalianVenueEmoji(place),
          displayType: getItalianVenueDisplayType(place.types || place.type),
          
          // Add walking information
          walkingTime: userLocation && place.distance ? 
            calculateWalkingTime(place.distance) : null,
          
          // Add contextual tips
          italianTips: getItalianVenueTips(place),
          
          // Format reviews for Italian context
          reviews: place.reviews ? place.reviews.map(review => ({
            ...review,
            timeAgo: formatTimeAgo(review.time)
          })) : []
        };

        logger.info('Place details retrieved successfully', {
          placeId,
          placeName: place.name,
          userLocation: userLocation ? 'provided' : 'not provided'
        });

        return successResponse(res, enhancedPlace, 'Place details retrieved successfully');

      } catch (apiError) {
        // Handle specific API errors gracefully
        console.warn('⚠️ Google Places API error for place details:', apiError.message);
        
        // Try to get basic place info from database as fallback
        try {
          const fallbackPlace = await prisma.place.findUnique({
            where: { googlePlaceId: placeId }
          });

          if (fallbackPlace) {
            console.log('📦 Using cached place data as fallback');
            
            const basicPlace = {
              ...fallbackPlace,
              emoji: getItalianVenueEmoji(fallbackPlace),
              displayType: getItalianVenueDisplayType(fallbackPlace.placeType),
              source: 'cache',
              reviews: [],
              photos: fallbackPlace.photos || [],
              photoUrls: { thumbnail: [], medium: [], large: [] }
            };

            return successResponse(res, basicPlace, 'Place details retrieved from cache');
          }
        } catch (dbError) {
          console.warn('⚠️ Database fallback also failed:', dbError.message);
        }

        // If all else fails, return a minimal error response
        return errorResponse(res, 'Place details temporarily unavailable', 503, 'SERVICE_UNAVAILABLE');
      }

    } catch (error) {
      logger.error('Failed to get place details', {
        placeId,
        error: error.message
      });

      return errorResponse(res, 'Failed to get place details', 500, 'PLACE_DETAILS_ERROR');
    }
  });

  // FIXED: Get popular places by type with proper service integration
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

      console.log('⭐ Getting popular places:', {
        type,
        minRating: minimumRating,
        limit: searchLimit,
        userLocation: userLocation ? 'provided' : 'not provided'
      });

      // FIXED: Use the Google Places service getPopularPlaces method
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

  // FIXED: Get places statistics with proper service integration
  getPlacesStatistics = asyncHandler(async (req, res) => {
    try {
      console.log('📊 Getting places statistics...');

      // FIXED: Use the Google Places service getItalianVenueStats method
      const stats = await googlePlacesService.getItalianVenueStats();

      logger.info('Places statistics retrieved', {
        totalPlaces: stats.totalPlaces || 0
      });

      return successResponse(res, stats, 'Places statistics retrieved successfully');

    } catch (error) {
      logger.error('Failed to get places statistics', {
        error: error.message
      });

      return errorResponse(res, 'Failed to get places statistics', 500, 'STATS_ERROR');
    }
  });

  // FIXED: Batch search multiple locations with proper validation
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

      console.log('🔍 Batch search request:', {
        locationCount: locations.length
      });

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

  // FIXED: Get places within geographic bounds
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

      console.log('🗺️ Bounds search:', {
        bounds: { north, south, east, west },
        center: { centerLat, centerLng },
        radius: Math.round(radius)
      });

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

  // FIXED: Get photo URLs for a place
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

      console.log('📸 Getting place photos:', { placeId, size });

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

  // FIXED: Health check for places service
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
const getItalianVenueEmoji = (place) => {
  const name = (place.name || '').toLowerCase();
  const types = place.types || [];
  
  if (name.includes('gelateria') || name.includes('gelato')) return '🍦';
  if (name.includes('pizzeria') || name.includes('pizza')) return '🍕';
  if (name.includes('pasticceria') || name.includes('dolci')) return '🧁';
  if (name.includes('panetteria') || name.includes('pane')) return '🥖';
  if (name.includes('trattoria')) return '🍝';
  if (name.includes('osteria')) return '🍷';
  
  if (types.includes('restaurant') || types.includes('meal_delivery')) return '🍽️';
  if (types.includes('bar') || types.includes('cafe')) return '☕';
  
  return '📍';
};

const getItalianVenueDisplayType = (types = []) => {
  if (types.includes('restaurant') || types.includes('meal_delivery')) {
    return 'Ristorante';
  }
  if (types.includes('bar') || types.includes('cafe')) {
    return 'Bar/Caffetteria';
  }
  if (types.includes('bakery')) {
    return 'Panetteria';
  }
  return 'Locale';
};

const calculateWalkingTime = (distanceInMeters) => {
  if (!distanceInMeters) return null;
  
  const walkingSpeedKmh = 5; // Average walking speed
  const timeMinutes = Math.round((distanceInMeters / 1000) * (60 / walkingSpeedKmh));
  
  if (timeMinutes < 1) return 'Meno di 1 minuto a piedi';
  if (timeMinutes === 1) return '1 minuto a piedi';
  if (timeMinutes < 60) return `${timeMinutes} minuti a piedi`;
  
  const hours = Math.floor(timeMinutes / 60);
  const mins = timeMinutes % 60;
  return `${hours}h ${mins}m a piedi`;
};

const getItalianVenueTips = (place) => {
  const tips = [];
  const name = (place.name || '').toLowerCase();
  const types = place.types || [];
  
  if (types.includes('bar') || types.includes('cafe')) {
    tips.push('I bar italiani servono caffè eccellente e aperitivi dalle 18:00');
    if (place.dynamicStatus?.isOpen === false) {
      tips.push('Molti bar chiudono nel pomeriggio e riaprono per l\'aperitivo');
    }
  }
  
  if (types.includes('restaurant')) {
    tips.push('I ristoranti italiani spesso aprono alle 19:30 per cena');
    if (place.priceLevel && place.priceLevel >= 3) {
      tips.push('Prenotazione consigliata per questo ristorante');
    }
  }
  
  if (name.includes('gelateria')) {
    tips.push('Le gelaterie artigianali offrono gelato fresco giornalmente');
  }
  
  return tips;
};

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return null;
  
  const now = Date.now() / 1000;
  const diffSeconds = now - timestamp;
  
  if (diffSeconds < 60) return 'Adesso';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} minuti fa`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} ore fa`;
  if (diffSeconds < 2592000) return `${Math.floor(diffSeconds / 86400)} giorni fa`;
  
  return 'Molto tempo fa';
};

// Create and export controller instance
const placesController = new PlacesController();

module.exports = placesController;