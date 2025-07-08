// services/googlePlacesService.js - FIXED VERSION with Rate Limiting
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

// Service configuration with improved rate limiting
const SERVICE_CONFIG = {
  defaultRadius: 1500,
  maxRadius: 50000,
  maxResults: 50,
  cacheEnabled: true, // ENABLE CACHE FOR PERFORMANCE
  batchSize: 20,
  
  // FIXED: Updated place type mappings for Italian caffeterias
  placeTypeMapping: {
    // Merge cafe and bar for Italian caffeterias
    cafe: ['cafe', 'bar', 'bakery', 'meal_takeaway'],
    // Separate pubs and nightlife
    pub: ['night_club', 'liquor_store'],
    restaurant: ['restaurant', 'meal_delivery', 'meal_takeaway']
  },
  
  // Rate limiting configuration
  rateLimit: {
    maxRequestsPerMinute: 50,  // Reduced from unlimited
    requestQueue: [],
    lastRequestTime: 0,
    minInterval: 1200 // Minimum 1.2 seconds between requests
  },
  
  // FIXED: Simplified required fields validation
  requiredFields: ['googlePlaceId', 'name', 'latitude', 'longitude'],
  
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
    this.requestQueue = [];
    this.processingQueue = false;
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

  // FIXED: Rate limiting with request queue
  async makeRateLimitedRequest(requestFunction) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        requestFunction,
        resolve,
        reject,
        timestamp: Date.now()
      });
      
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processingQueue || this.requestQueue.length === 0) {
      return;
    }
    
    this.processingQueue = true;
    
    while (this.requestQueue.length > 0) {
      const { requestFunction, resolve, reject } = this.requestQueue.shift();
      
      try {
        // Enforce minimum interval between requests
        const now = Date.now();
        const timeSinceLastRequest = now - SERVICE_CONFIG.rateLimit.lastRequestTime;
        
        if (timeSinceLastRequest < SERVICE_CONFIG.rateLimit.minInterval) {
          const waitTime = SERVICE_CONFIG.rateLimit.minInterval - timeSinceLastRequest;
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        const result = await requestFunction();
        SERVICE_CONFIG.rateLimit.lastRequestTime = Date.now();
        resolve(result);
        
        // Small delay between queued requests
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error('❌ RATE LIMITED REQUEST ERROR:', error);
        
        // Handle rate limiting specifically
        if (error.message.includes('429') || error.message.includes('Troppe richieste')) {
          // Exponential backoff for rate limiting
          const backoffTime = Math.min(5000, 1000 * Math.pow(2, this.requestQueue.length));
          console.log(`⏳ Rate limited, waiting ${backoffTime}ms before retry`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          
          // Re-queue the request
          this.requestQueue.unshift({ requestFunction, resolve, reject });
        } else {
          reject(error);
        }
      }
    }
    
    this.processingQueue = false;
  }

  // FIXED: Improved validation logic
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
                   !isNaN(place.longitude) &&
                   place.latitude >= -90 && place.latitude <= 90 &&
                   place.longitude >= -180 && place.longitude <= 180;

    console.log('✅ VALIDATION RESULT:', {
      placeId: place.googlePlaceId,
      isValid: isValid,
      reason: isValid ? 'All fields valid' : 'Missing or invalid required fields'
    });

    return isValid;
  }

  // FIXED: Search with debouncing and improved caching
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

      // Validate place type - map to our supported types
      const mappedType = this.mapPlaceType(type);

      console.log('🚀 STARTING NEARBY SEARCH:', {
        latitude,
        longitude,
        type: mappedType,
        radius,
        limit
      });

      // IMPROVED: Cache with location-based key
      if (SERVICE_CONFIG.cacheEnabled) {
        const cacheKey = `nearby:${Math.round(latitude * 1000)}:${Math.round(longitude * 1000)}:${radius}:${mappedType}`;
        const cachedResults = await redisService.getNearbyPlaces(latitude, longitude, radius, mappedType);
        if (cachedResults && cachedResults.length > 0) {
          console.log('📦 CACHE HIT - returning cached results:', cachedResults.length);
          logger.debug('Returning cached nearby places', {
            latitude,
            longitude,
            type: mappedType,
            count: cachedResults.length
          });
          
          return this.formatPlacesResponse(cachedResults, userLocation, limit);
        }
      }

      // Search Google Places API with rate limiting
      console.log('🌐 CALLING GOOGLE PLACES API WITH RATE LIMITING...');
      
      const places = await this.makeRateLimitedRequest(async () => {
        return await searchNearbyPlaces(latitude, longitude, mappedType, radius);
      });
      
      console.log('📡 API RESPONSE:', { count: places.length });

      // Process and save places to database
      console.log('🔄 PROCESSING PLACES...');
      const processedPlaces = await this.processAndSavePlaces(places, mappedType);
      console.log('✅ PROCESSED PLACES:', { count: processedPlaces.length });

      // Cache results if enabled with longer TTL
      if (SERVICE_CONFIG.cacheEnabled && processedPlaces.length > 0) {
        console.log('💾 CACHING RESULTS...');
        await redisService.cacheNearbyPlaces(latitude, longitude, radius, mappedType, processedPlaces);
      }

      logger.info('Nearby places search completed', {
        latitude,
        longitude,
        type: mappedType,
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
      
      // Return cached results if available, even if stale
      if (SERVICE_CONFIG.cacheEnabled) {
        try {
          const staleResults = await redisService.getNearbyPlaces(latitude, longitude, options.radius || SERVICE_CONFIG.defaultRadius, this.mapPlaceType(options.type || 'cafe'));
          if (staleResults && staleResults.length > 0) {
            console.log('📦 RETURNING STALE CACHE DUE TO ERROR');
            return this.formatPlacesResponse(staleResults, options.userLocation, options.limit);
          }
        } catch (cacheError) {
          console.error('Cache fallback also failed:', cacheError);
        }
      }
      
      throw error;
    }
  }

  // NEW: Map place types for Italian caffeterias
  mapPlaceType(type) {
    const typeMapping = {
      'cafe': 'cafe',     // Will search for both cafe and bar
      'bar': 'cafe',      // Map bar to cafe for Italian caffeterias
      'pub': 'pub',       // Keep pubs separate
      'restaurant': 'restaurant'
    };
    
    return typeMapping[type] || 'cafe';
  }

  // FIXED: Improved place processing with better error handling
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
          // Validate place data with improved validation
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

          // Save or update place in database with retry logic
          const savedPlace = await this.saveOrUpdatePlaceWithRetry(place, placeType);
          if (savedPlace) {
            processedPlaces.push(savedPlace);
            console.log('💾 PLACE SAVED SUCCESSFULLY');
          }
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

  // NEW: Save with retry logic for database conflicts
  async saveOrUpdatePlaceWithRetry(placeData, placeType = null, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.saveOrUpdatePlace(placeData, placeType);
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retry with exponential backoff
        const waitTime = Math.min(1000 * Math.pow(2, attempt), 5000);
        console.log(`⏳ Database save failed, retrying in ${waitTime}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // Keep existing methods but with improved error handling...
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

  // IMPROVED: Better place type detection for Italian venues
  determinePlaceType(types) {
    // Priority order for Italian venues
    const typeChecks = [
      { category: 'cafe', keywords: ['cafe', 'bar', 'bakery', 'coffee'] },
      { category: 'pub', keywords: ['night_club', 'liquor_store', 'pub'] },
      { category: 'restaurant', keywords: ['restaurant', 'meal_delivery', 'meal_takeaway'] }
    ];
    
    for (const check of typeChecks) {
      if (types.some(type => check.keywords.some(keyword => type.includes(keyword)))) {
        return check.category;
      }
    }
    
    // Default to cafe for Italian venues
    return 'cafe';
  }

  // Keep all other existing methods unchanged...
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

  // Health check with rate limiting status
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
        rateLimiting: {
          queueLength: this.requestQueue.length,
          processingQueue: this.processingQueue,
          lastRequestTime: SERVICE_CONFIG.rateLimit.lastRequestTime
        },
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

  // Keep other existing methods (getPlaceById, searchByText, etc.)...
  async getPlaceStatistics() {
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
}

// Create and export singleton instance
const googlePlacesService = new GooglePlacesService();

module.exports = googlePlacesService;