// services/googlePlacesService.js - CRITICAL FIX
// Location: /backend/services/googlePlacesService.js

const { prisma } = require('../config/prisma');
const { 
  searchNearbyPlaces, 
  getPlaceDetails, 
  searchPlacesByText,
  getPhotoUrl,
  validateApiKey 
} = require('../config/googlePlaces');
const redisService = require('./redisService');
const logger = require('../utils/logger');
const { formatPlace, calculateDistance } = require('../utils/helpers');
const { isValidLatitude, isValidLongitude, isValidPlaceType } = require('../utils/validators');

// Service configuration
const SERVICE_CONFIG = {
  defaultRadius: 1500,
  maxRadius: 50000,
  maxResults: 50,
  cacheEnabled: true, // ENABLE CACHE FOR PERFORMANCE
  batchSize: 20,
  
  // Place type mappings
  placeTypeMapping: {
    cafe: ['cafe', 'bakery', 'meal_takeaway'],
    bar: ['bar', 'night_club', 'liquor_store'],
    restaurant: ['restaurant', 'meal_delivery', 'meal_takeaway']
  },
  
  // FIXED: Updated required fields to match actual data structure
  requiredFields: ['googlePlaceId', 'name', 'latitude', 'longitude'], // SIMPLIFIED VALIDATION
  
  // Photo size configurations
  photoSizes: {
    thumbnail: { width: 200, height: 200 },
    medium: { width: 400, height: 400 },
    large: { width: 800, height: 600 }
  }
};

class GooglePlacesService {
  constructor() {
    this.isInitialized = false;
    this.apiKeyValid = false;
  }

  // Initialize the service
  async initialize() {
    try {
      this.apiKeyValid = await validateApiKey();
      this.isInitialized = true;
      
      logger.info('Google Places Service initialized', {
        apiKeyValid: this.apiKeyValid
      });
      
      return this.apiKeyValid;
    } catch (error) {
      logger.error('Failed to initialize Google Places Service', {
        error: error.message
      });
      return false;
    }
  }

  // FIXED: Corrected validation logic
  validatePlaceData(place) {
    console.log('🔍 VALIDATING PLACE:', {
      googlePlaceId: place.googlePlaceId,
      name: place.name,
      hasLatitude: place.latitude !== undefined,
      hasLongitude: place.longitude !== undefined,
      latitude: place.latitude,
      longitude: place.longitude
    });

    // Check if all required fields exist and are valid
    const isValid = place && 
                   place.googlePlaceId && 
                   place.name && 
                   typeof place.latitude === 'number' && 
                   typeof place.longitude === 'number' &&
                   !isNaN(place.latitude) &&
                   !isNaN(place.longitude);

    console.log('✅ VALIDATION RESULT:', {
      placeId: place.googlePlaceId,
      isValid: isValid,
      reason: isValid ? 'All fields valid' : 'Missing or invalid required fields'
    });

    return isValid;
  }

  // Search for nearby places
  async searchNearby(latitude, longitude, options = {}) {
    try {
      // Validate inputs
      if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
        throw new Error('Invalid coordinates provided');
      }

      const {
        type = 'cafe',
        radius = SERVICE_CONFIG.defaultRadius,
        limit = 20,
        includeDetails = false,
        userLocation = null
      } = options;

      // Validate place type
      if (!isValidPlaceType(type)) {
        throw new Error('Invalid place type provided');
      }

      console.log('🚀 STARTING NEARBY SEARCH:', {
        latitude,
        longitude,
        type,
        radius,
        limit
      });

      // Check cache first
      if (SERVICE_CONFIG.cacheEnabled) {
        const cacheKey = `nearby:${latitude}:${longitude}:${radius}:${type}`;
        const cachedResults = await redisService.getNearbyPlaces(latitude, longitude, radius, type);
        if (cachedResults) {
          console.log('📦 CACHE HIT - returning cached results');
          logger.debug('Returning cached nearby places', {
            latitude,
            longitude,
            type,
            count: cachedResults.length
          });
          
          return this.formatPlacesResponse(cachedResults, userLocation, limit);
        }
      }

      // Search Google Places API
      console.log('🌐 CALLING GOOGLE PLACES API...');
      const places = await searchNearbyPlaces(latitude, longitude, type, radius);
      console.log('📡 API RESPONSE:', { count: places.length });

      // Process and save places to database
      console.log('🔄 PROCESSING PLACES...');
      const processedPlaces = await this.processAndSavePlaces(places, type);
      console.log('✅ PROCESSED PLACES:', { count: processedPlaces.length });

      // Cache results if enabled
      if (SERVICE_CONFIG.cacheEnabled && processedPlaces.length > 0) {
        console.log('💾 CACHING RESULTS...');
        await redisService.cacheNearbyPlaces(latitude, longitude, radius, type, processedPlaces);
      }

      logger.info('Nearby places search completed', {
        latitude,
        longitude,
        type,
        radius,
        apiResultCount: places.length,
        processedCount: processedPlaces.length
      });

      return this.formatPlacesResponse(processedPlaces, userLocation, limit);
    } catch (error) {
      console.error('❌ NEARBY SEARCH ERROR:', error);
      logger.error('Nearby places search failed', {
        latitude,
        longitude,
        options,
        error: error.message
      });
      throw error;
    }
  }

  // Process and save places to database
  async processAndSavePlaces(places, placeType = null) {
    try {
      const processedPlaces = [];
      console.log(`🔄 PROCESSING ${places.length} PLACES FROM GOOGLE API...`);

      for (let i = 0; i < places.length; i++) {
        const place = places[i];
        console.log(`\n📍 PROCESSING PLACE ${i + 1}/${places.length}:`, {
          googlePlaceId: place.googlePlaceId,
          name: place.name
        });

        try {
          // Validate place data
          if (!this.validatePlaceData(place)) {
            console.log('❌ PLACE VALIDATION FAILED - SKIPPING');
            logger.warn('Invalid place data, skipping', { 
              placeId: place.googlePlaceId,
              name: place.name,
              hasLatitude: !!place.latitude,
              hasLongitude: !!place.longitude
            });
            continue;
          }

          console.log('✅ PLACE VALIDATION PASSED - SAVING TO DB');

          // Save or update place in database
          const savedPlace = await this.saveOrUpdatePlace(place, placeType);
          processedPlaces.push(savedPlace);
          
          console.log('💾 PLACE SAVED SUCCESSFULLY');
        } catch (error) {
          console.log('❌ FAILED TO PROCESS PLACE:', error.message);
          logger.warn('Failed to process individual place', {
            placeId: place.googlePlaceId,
            error: error.message
          });
          // Continue processing other places
        }
      }

      console.log(`\n✅ PROCESSING COMPLETE: ${processedPlaces.length}/${places.length} places saved`);
      return processedPlaces;
    } catch (error) {
      console.error('❌ BATCH PROCESSING ERROR:', error);
      logger.error('Failed to process places batch', {
        error: error.message,
        placesCount: places.length
      });
      throw error;
    }
  }

  // Save or update place in database
  async saveOrUpdatePlace(placeData, placeType = null) {
    try {
      // Determine place type if not provided
      if (!placeType) {
        placeType = this.determinePlaceType(placeData.types || []);
      }

      console.log('💾 SAVING PLACE TO DATABASE:', {
        googlePlaceId: placeData.googlePlaceId,
        name: placeData.name,
        placeType
      });

      const placeRecord = {
        googlePlaceId: placeData.googlePlaceId,
        name: placeData.name,
        address: placeData.address || '',
        latitude: placeData.latitude,
        longitude: placeData.longitude,
        placeType: placeType || 'cafe',
        rating: placeData.rating || null,
        priceLevel: placeData.priceLevel || null,
        phoneNumber: placeData.phoneNumber || null,
        website: placeData.website || null,
        openingHours: placeData.openingHours || null,
        photos: placeData.photos || [],
        businessStatus: placeData.businessStatus || 'OPERATIONAL',
        lastUpdated: new Date()
      };

      // Use upsert to create or update
      const place = await prisma.place.upsert({
        where: { googlePlaceId: placeData.googlePlaceId },
        update: {
          ...placeRecord,
          updatedAt: new Date()
        },
        create: {
          ...placeRecord,
          createdAt: new Date()
        }
      });

      console.log('✅ PLACE SAVED TO DATABASE:', {
        id: place.id,
        googlePlaceId: place.googlePlaceId,
        name: place.name
      });

      logger.debug('Place saved/updated in database', {
        googlePlaceId: place.googlePlaceId,
        name: place.name
      });

      return place;
    } catch (error) {
      console.error('❌ DATABASE SAVE ERROR:', error);
      logger.error('Failed to save place to database', {
        googlePlaceId: placeData.googlePlaceId,
        error: error.message
      });
      throw error;
    }
  }

  // Get place from database
  async getPlaceFromDatabase(googlePlaceId) {
    try {
      const place = await prisma.place.findUnique({
        where: { googlePlaceId }
      });

      return place;
    } catch (error) {
      logger.error('Failed to get place from database', {
        googlePlaceId,
        error: error.message
      });
      return null;
    }
  }

  // Check if place data should be refreshed
  shouldRefreshPlaceData(place) {
    if (!place.lastUpdated) return true;
    
    // Refresh if data is older than 24 hours
    const dayOld = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return place.lastUpdated < dayOld;
  }

  // Determine place type from Google Place types
  determinePlaceType(types) {
    // Check each type category
    for (const [category, googleTypes] of Object.entries(SERVICE_CONFIG.placeTypeMapping)) {
      if (types.some(type => googleTypes.includes(type))) {
        return category;
      }
    }
    
    // Default to cafe if no specific type found
    return 'cafe';
  }

  // Format places response
  formatPlacesResponse(places, userLocation = null, limit = 20) {
    console.log('📋 FORMATTING RESPONSE:', {
      placesCount: places.length,
      hasUserLocation: !!userLocation,
      limit
    });

    let formattedPlaces = places.map(place => formatPlace(place, userLocation));

    // Sort by distance if user location provided
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      formattedPlaces = formattedPlaces.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    // Apply limit
    if (limit && formattedPlaces.length > limit) {
      formattedPlaces = formattedPlaces.slice(0, limit);
    }

    const response = {
      places: formattedPlaces,
      count: formattedPlaces.length,
      userLocation: userLocation ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude
      } : null
    };

    console.log('✅ RESPONSE FORMATTED:', {
      finalCount: response.count,
      hasUserLocation: !!response.userLocation
    });

    return response;
  }

  // Get detailed information about a specific place
  async getPlaceById(placeId, options = {}) {
    try {
      const { includeReviews = true, userLocation = null } = options;

      // Check cache first
      if (SERVICE_CONFIG.cacheEnabled) {
        const cachedPlace = await redisService.getPlaceDetails(placeId);
        if (cachedPlace) {
          logger.debug('Returning cached place details', { placeId });
          return this.formatPlaceResponse(cachedPlace, userLocation);
        }
      }

      // Try to get from database first
      let place = await this.getPlaceFromDatabase(placeId);
      
      if (!place || this.shouldRefreshPlaceData(place)) {
        // Fetch fresh data from Google Places API
        const googlePlaceData = await getPlaceDetails(placeId);
        place = await this.saveOrUpdatePlace(googlePlaceData);
        
        // Cache the fresh data
        if (SERVICE_CONFIG.cacheEnabled) {
          await redisService.cachePlaceDetails(placeId, place);
        }
      }

      logger.info('Place details retrieved', { placeId });
      return this.formatPlaceResponse(place, userLocation, includeReviews);
    } catch (error) {
      logger.error('Failed to get place details', {
        placeId,
        error: error.message
      });
      throw error;
    }
  }

  // Format single place response
  formatPlaceResponse(place, userLocation = null, includeReviews = true) {
    const formatted = formatPlace(place, userLocation);

    // Add photo URLs
    if (place.photos && Array.isArray(place.photos)) {
      formatted.photoUrls = {
        thumbnail: place.photos.map(photo => 
          getPhotoUrl(photo.photoReference, 
            SERVICE_CONFIG.photoSizes.thumbnail.width,
            SERVICE_CONFIG.photoSizes.thumbnail.height)
        ).filter(url => url),
        medium: place.photos.map(photo => 
          getPhotoUrl(photo.photoReference,
            SERVICE_CONFIG.photoSizes.medium.width,
            SERVICE_CONFIG.photoSizes.medium.height)
        ).filter(url => url)
      };
    }

    return formatted;
  }

  // Search places by text query
  async searchByText(query, options = {}) {
    try {
      const {
        latitude = null,
        longitude = null,
        limit = 20,
        userLocation = null
      } = options;

      // Validate query
      if (!query || query.trim().length < 2) {
        throw new Error('Search query must be at least 2 characters');
      }

      // Check cache first
      if (SERVICE_CONFIG.cacheEnabled) {
        const cachedResults = await redisService.getTextSearch(query, latitude, longitude);
        if (cachedResults) {
          logger.debug('Returning cached text search results', { query });
          return this.formatPlacesResponse(cachedResults, userLocation, limit);
        }
      }

      // Search Google Places API
      const places = await searchPlacesByText(query, latitude, longitude);
      
      // Process and save places
      const processedPlaces = await this.processAndSavePlaces(places);

      // Cache results
      if (SERVICE_CONFIG.cacheEnabled) {
        await redisService.cacheTextSearch(query, latitude, longitude, processedPlaces);
      }

      logger.info('Text search completed', {
        query,
        latitude,
        longitude,
        resultCount: processedPlaces.length
      });

      return this.formatPlacesResponse(processedPlaces, userLocation, limit);
    } catch (error) {
      logger.error('Text search failed', {
        query,
        options,
        error: error.message
      });
      throw error;
    }
  }

  // Get popular places by type
  async getPopularPlaces(type = 'cafe', options = {}) {
    try {
      const {
        limit = 10,
        userLocation = null,
        minRating = 4.0
      } = options;

      const places = await prisma.place.findMany({
        where: {
          placeType: type,
          rating: { gte: minRating },
          businessStatus: 'OPERATIONAL'
        },
        orderBy: [
          { rating: 'desc' },
          { createdAt: 'desc' }
        ],
        take: limit
      });

      logger.debug('Popular places retrieved', {
        type,
        count: places.length,
        minRating
      });

      return this.formatPlacesResponse(places, userLocation, limit);
    } catch (error) {
      logger.error('Failed to get popular places', {
        type,
        error: error.message
      });
      throw error;
    }
  }

  // Get places statistics
  async getPlacesStatistics() {
    try {
      const stats = await prisma.place.groupBy({
        by: ['placeType'],
        _count: { id: true },
        _avg: { rating: true }
      });

      const totalPlaces = await prisma.place.count();
      const recentlyUpdated = await prisma.place.count({
        where: {
          lastUpdated: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });

      return {
        totalPlaces,
        recentlyUpdated,
        byType: stats.reduce((acc, stat) => {
          acc[stat.placeType] = {
            count: stat._count.id,
            averageRating: stat._avg.rating ? Number(stat._avg.rating.toFixed(1)) : null
          };
          return acc;
        }, {})
      };
    } catch (error) {
      logger.error('Failed to get places statistics', {
        error: error.message
      });
      throw error;
    }
  }

  // Health check for Google Places service
  async healthCheck() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const stats = await this.getPlacesStatistics();
      
      return {
        status: this.apiKeyValid ? 'healthy' : 'degraded',
        apiKeyValid: this.apiKeyValid,
        isInitialized: this.isInitialized,
        timestamp: new Date().toISOString(),
        statistics: stats
      };
    } catch (error) {
      logger.error('Google Places service health check failed', {
        error: error.message
      });
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create and export singleton instance
const googlePlacesService = new GooglePlacesService();

module.exports = googlePlacesService;