// services/googlePlacesService.js - FIXED VERSION with Enhanced Italian Venue Support
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
const { formatPlace, calculateDistance, formatDistance } = require('../utils/helpers');
const { isValidLatitude, isValidLongitude, isValidPlaceType } = require('../utils/validators');

// OPTIMIZED: Configuration for Italian venues
const SERVICE_CONFIG = {
  defaultRadius: 1000, // Reduced for denser Italian cities
  maxRadius: 50000,
  maxResults: 25, // Reasonable limit
  cacheEnabled: true,
  batchSize: 20,
  
  // OPTIMIZED: Better place type mapping for Italian venues
  placeTypeMapping: {
    cafe: ['cafe', 'bar', 'bakery'], // Italian bars are cafes
    pub: ['bar', 'night_club', 'liquor_store', 'establishment'], // Include bar for pubs
    restaurant: ['restaurant', 'meal_delivery', 'meal_takeaway', 'food', 'establishment']
  },
  
  // OPTIMIZED: Simplified validation - only check essential fields
  requiredFields: ['googlePlaceId', 'name', 'latitude', 'longitude'],
  
  // ENHANCED: Photo configurations with multiple sizes
  photoSizes: {
    thumbnail: { width: 200, height: 200 },
    medium: { width: 400, height: 400 },
    large: { width: 800, height: 600 }
  },

  // OPTIMIZED: Italian-specific keywords for better venue detection
  italianVenueKeywords: {
    cafe: ['bar', 'caffe', 'caffè', 'caffetteria', 'pasticceria', 'gelateria'],
    pub: ['pub', 'birreria', 'disco', 'club', 'locale notturno', 'beer', 'birra'],
    restaurant: ['ristorante', 'pizzeria', 'trattoria', 'osteria', 'tavola calda']
  }
};

class GooglePlacesService {
  constructor() {
    this.isInitialized = false;
    this.apiKeyValid = false;
    this.requestQueue = [];
    this.processingQueue = false;
    this.lastRequestTime = 0;
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

  // OPTIMIZED: Simplified and more reliable validation
  validatePlaceData(place) {
    if (!place) {
      console.log('❌ VALIDATION: Place is null/undefined');
      return false;
    }

    // Check essential fields with flexible validation
    const hasId = place.googlePlaceId && typeof place.googlePlaceId === 'string';
    const hasName = place.name && typeof place.name === 'string' && place.name.trim().length > 0;
    const hasValidLat = typeof place.latitude === 'number' && 
                       !isNaN(place.latitude) && 
                       place.latitude >= -90 && place.latitude <= 90;
    const hasValidLng = typeof place.longitude === 'number' && 
                       !isNaN(place.longitude) && 
                       place.longitude >= -180 && place.longitude <= 180;

    const isValid = hasId && hasName && hasValidLat && hasValidLng;

    console.log('🔍 VALIDATION RESULT:', {
      placeId: place.googlePlaceId,
      name: place.name,
      hasId,
      hasName,
      hasValidLat,
      hasValidLng,
      isValid,
      coords: `${place.latitude}, ${place.longitude}`
    });

    return isValid;
  }

  // ENHANCED: Generate photo URLs for all sizes
  generatePhotoUrls(photos) {
    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return {
        thumbnail: [],
        medium: [],
        large: []
      };
    }

    const photoUrls = {
      thumbnail: [],
      medium: [],
      large: []
    };

    // Generate URLs for each photo in different sizes
    photos.forEach(photo => {
      if (photo.photoReference || photo.photo_reference) {
        const photoRef = photo.photoReference || photo.photo_reference;
        
        Object.entries(SERVICE_CONFIG.photoSizes).forEach(([size, dimensions]) => {
          const photoUrl = getPhotoUrl(photoRef, dimensions.width, dimensions.height);
          if (photoUrl) {
            photoUrls[size].push(photoUrl);
          }
        });
      }
    });

    console.log('📸 Generated photo URLs:', {
      totalPhotos: photos.length,
      thumbnails: photoUrls.thumbnail.length,
      medium: photoUrls.medium.length,
      large: photoUrls.large.length
    });

    return photoUrls;
  }

  // ENHANCED: Format opening hours for Italian context
  formatOpeningHours(openingHours) {
    if (!openingHours) {
      return null;
    }

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

    console.log('🕒 Formatted opening hours:', {
      openNow: formatted.openNow,
      hasWeekdayText: formatted.weekdayText?.length > 0,
      hasPeriods: formatted.periods?.length > 0
    });

    return formatted;
  }

  // ENHANCED: Search for nearby places with Italian venue support
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

      // Map to supported types
      const mappedType = this.mapPlaceType(type);

      console.log('🚀 STARTING NEARBY SEARCH:', {
        latitude: latitude.toFixed(4),
        longitude: longitude.toFixed(4),
        type: mappedType,
        radius,
        limit
      });

      // Check cache first
      if (SERVICE_CONFIG.cacheEnabled) {
        const cacheKey = `nearby:${Math.round(latitude * 1000)}:${Math.round(longitude * 1000)}:${radius}:${mappedType}`;
        const cachedResults = await redisService.getNearbyPlaces(latitude, longitude, radius, mappedType);
        
        if (cachedResults && cachedResults.length > 0) {
          console.log('📦 CACHE HIT - returning cached results:', cachedResults.length);
          return this.formatPlacesResponse(cachedResults, userLocation, limit);
        }
      }

      // Search Google Places API
      console.log('🌐 CALLING GOOGLE PLACES API...');
      
      const apiResults = await searchNearbyPlaces(latitude, longitude, mappedType, radius);
      console.log('📡 API RESPONSE:', { 
        totalPlaces: apiResults.length,
        validPlaces: apiResults.filter(p => this.validatePlaceData(p)).length
      });

      // Process and save places
      console.log('🔄 PROCESSING PLACES...');
      const processedPlaces = await this.processAndSavePlaces(apiResults, mappedType);
      console.log('✅ PROCESSED PLACES:', { 
        saved: processedPlaces.length,
        skipped: apiResults.length - processedPlaces.length
      });

      // Cache results
      if (SERVICE_CONFIG.cacheEnabled && processedPlaces.length > 0) {
        console.log('💾 CACHING RESULTS...');
        await redisService.cacheNearbyPlaces(latitude, longitude, radius, mappedType, processedPlaces);
      }

      logger.info('Nearby places search completed', {
        latitude,
        longitude,
        type: mappedType,
        radius,
        apiResultCount: apiResults.length,
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
      
      // Return cached results if available on error
      if (SERVICE_CONFIG.cacheEnabled) {
        try {
          const staleResults = await redisService.getNearbyPlaces(
            latitude, 
            longitude, 
            options.radius || SERVICE_CONFIG.defaultRadius, 
            this.mapPlaceType(options.type || 'cafe')
          );
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

  // OPTIMIZED: Better Italian venue type mapping
  mapPlaceType(type) {
    const typeMapping = {
      'cafe': 'cafe',     // Italian bars/caffeterias
      'bar': 'cafe',      // Map to cafe for Italian context
      'pub': 'pub',       // Keep pubs separate
      'restaurant': 'restaurant'
    };
    
    return typeMapping[type] || 'cafe';
  }

  // ENHANCED: Place processing with Italian venue detection
  async processAndSavePlaces(places, placeType = null) {
    try {
      const processedPlaces = [];
      console.log(`🔄 PROCESSING ${places.length} PLACES FROM GOOGLE API...`);

      for (let i = 0; i < places.length; i++) {
        const place = places[i];
        console.log(`\n📍 PROCESSING PLACE ${i + 1}/${places.length}:`, {
          googlePlaceId: place.googlePlaceId,
          name: place.name,
          hasLocation: !!(place.latitude && place.longitude)
        });

        try {
          // Validate with the improved validation function
          if (!this.validatePlaceData(place)) {
            console.log('❌ PLACE VALIDATION FAILED - SKIPPING');
            continue;
          }

          console.log('✅ PLACE VALIDATION PASSED - SAVING TO DB');

          // Enhanced place type detection for Italian venues
          const detectedType = this.detectItalianVenueType(place, placeType);

          // Save to database
          const savedPlace = await this.saveOrUpdatePlace(place, detectedType);
          if (savedPlace) {
            processedPlaces.push(savedPlace);
            console.log('💾 PLACE SAVED SUCCESSFULLY');
          }
          
        } catch (error) {
          console.log('❌ FAILED TO PROCESS PLACE:', error.message);
          logger.warn('Failed to process individual place', {
            placeId: place.googlePlaceId,
            name: place.name,
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

  // OPTIMIZED: Enhanced Italian venue type detection with Google types priority
  detectItalianVenueType(place, fallbackType) {
    const name = (place.name || '').toLowerCase();
    const types = place.types || [];
    
    console.log('🏷️ TYPE DETECTION:', { 
      name: name.substring(0, 30), 
      types: types.slice(0, 5), 
      fallback: fallbackType 
    });
    
    // PRIORITY 1: Google Place types (most reliable)
    if (types.includes('night_club') || types.includes('liquor_store')) {
      console.log('🍺 DETECTED AS PUB via Google types');
      return 'pub';
    }
    
    if (types.includes('restaurant') || types.includes('meal_delivery') || types.includes('meal_takeaway')) {
      console.log('🍽️ DETECTED AS RESTAURANT via Google types');
      return 'restaurant';
    }
    
    // PRIORITY 2: Italian name analysis (for local context)
    if (name.includes('pub') || name.includes('birreria') || name.includes('beer') || name.includes('birra')) {
      console.log('🍺 DETECTED AS PUB via Italian keywords');
      return 'pub';
    }
    
    if (name.includes('ristorante') || name.includes('pizzeria') || name.includes('trattoria') || name.includes('osteria')) {
      console.log('🍽️ DETECTED AS RESTAURANT via Italian keywords');
      return 'restaurant';
    }
    
    // PRIORITY 3: Fallback type or default
    const finalType = fallbackType || 'cafe';
    console.log('☕ USING FALLBACK TYPE:', finalType);
    return finalType;
  }

  // ENHANCED: Database save with conflict handling
  async saveOrUpdatePlace(placeData, placeType = null) {
    try {
      const finalPlaceType = placeType || this.detectItalianVenueType(placeData);

      console.log('💾 SAVING PLACE TO DATABASE:', {
        googlePlaceId: placeData.googlePlaceId,
        name: placeData.name,
        placeType: finalPlaceType
      });

      const placeRecord = {
        googlePlaceId: placeData.googlePlaceId,
        name: placeData.name,
        address: placeData.address || '',
        latitude: placeData.latitude,
        longitude: placeData.longitude,
        placeType: finalPlaceType,
        rating: placeData.rating || null,
        priceLevel: placeData.priceLevel || null,
        phoneNumber: placeData.phoneNumber || null,
        website: placeData.website || null,
        openingHours: placeData.openingHours || null,
        photos: placeData.photos || [],
        businessStatus: placeData.businessStatus || 'OPERATIONAL',
        lastUpdated: new Date()
      };

      // Use upsert with better conflict resolution
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

      return place;
      
    } catch (error) {
      console.error('❌ DATABASE SAVE ERROR:', error);
      
      // Handle specific database errors
      if (error.code === 'P2002') {
        console.log('⚠️ Duplicate place, updating existing...');
        // Try to update existing record
        try {
          const existingPlace = await prisma.place.findUnique({
            where: { googlePlaceId: placeData.googlePlaceId }
          });
          if (existingPlace) {
            return existingPlace;
          }
        } catch (updateError) {
          console.error('Failed to handle duplicate:', updateError);
        }
      }
      
      logger.error('Failed to save place to database', {
        googlePlaceId: placeData.googlePlaceId,
        error: error.message
      });
      
      throw error;
    }
  }

  // ENHANCED: Get place by ID with complete photos and hours
  async getPlaceById(placeId, options = {}) {
    try {
      if (!placeId) {
        throw new Error('Place ID is required');
      }

      const { userLocation, includeReviews = true } = options;

      console.log('📍 FETCHING PLACE DETAILS WITH PHOTOS AND HOURS:', { placeId, userLocation });

      // Check cache first
      if (SERVICE_CONFIG.cacheEnabled) {
        const cacheKey = `place_details:${placeId}`;
        const cachedResult = await redisService.getPlaceDetails(placeId);
        
        if (cachedResult) {
          console.log('📦 PLACE DETAILS CACHE HIT');
          
          // Add distance if user location provided
          if (userLocation && cachedResult.latitude && cachedResult.longitude) {
            const distance = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              cachedResult.latitude,
              cachedResult.longitude
            );
            cachedResult.distance = Math.round(distance);
            cachedResult.formattedDistance = formatDistance(distance);
          }
          
          return cachedResult;
        }
      }

      // Try to get from database first
      let place = await prisma.place.findUnique({
        where: { googlePlaceId: placeId }
      });

      if (place) {
        console.log('💾 FOUND PLACE IN DATABASE, ENHANCING WITH GOOGLE DATA');
        
        // ENHANCED: Always fetch fresh Google details for photos and hours
        try {
          console.log('🌐 FETCHING FRESH GOOGLE PLACE DETAILS FOR PHOTOS/HOURS...');
          const googleDetails = await getPlaceDetails(placeId);
          
          console.log('📡 GOOGLE DETAILS RESPONSE:', {
            hasPhotos: !!(googleDetails.photos && googleDetails.photos.length > 0),
            hasOpeningHours: !!googleDetails.openingHours,
            hasPhone: !!googleDetails.phoneNumber,
            hasWebsite: !!googleDetails.website,
            hasReviews: !!(googleDetails.reviews && googleDetails.reviews.length > 0)
          });

          // ENHANCED: Generate photo URLs for all sizes
          const photoUrls = this.generatePhotoUrls(googleDetails.photos);
          
          // ENHANCED: Format opening hours properly
          const formattedHours = this.formatOpeningHours(googleDetails.openingHours);

          // Merge database and Google data with enhanced fields
          const enhancedPlace = {
            ...place,
            ...googleDetails,
            // Keep database fields as primary
            id: place.id,
            googlePlaceId: place.googlePlaceId,
            lastUpdated: place.lastUpdated,
            // ENHANCED: Add photo URLs and formatted hours
            photoUrls: photoUrls,
            openingHours: formattedHours,
            // Ensure we have all the details
            photos: googleDetails.photos || place.photos || [],
            phoneNumber: googleDetails.phoneNumber || place.phoneNumber,
            website: googleDetails.website || place.website,
            reviews: includeReviews ? (googleDetails.reviews || []) : []
          };

          // Update database with fresh data
          await prisma.place.update({
            where: { id: place.id },
            data: {
              rating: enhancedPlace.rating || place.rating,
              phoneNumber: enhancedPlace.phoneNumber || place.phoneNumber,
              website: enhancedPlace.website || place.website,
              openingHours: formattedHours || place.openingHours,
              photos: enhancedPlace.photos || place.photos,
              lastUpdated: new Date()
            }
          });

          place = enhancedPlace;
          
        } catch (googleError) {
          console.warn('⚠️ Failed to fetch Google details, using database data:', googleError.message);
          // Generate empty photo URLs structure for consistency
          place.photoUrls = this.generatePhotoUrls([]);
          place.openingHours = this.formatOpeningHours(place.openingHours);
        }
      } else {
        console.log('🌐 PLACE NOT IN DATABASE, FETCHING FROM GOOGLE PLACES API');
        
        // Get full details from Google Places
        const googlePlace = await getPlaceDetails(placeId);
        
        if (!googlePlace) {
          throw new Error('Place not found');
        }

        // ENHANCED: Process Google place with photos and hours
        googlePlace.photoUrls = this.generatePhotoUrls(googlePlace.photos);
        googlePlace.openingHours = this.formatOpeningHours(googlePlace.openingHours);

        // Save to database
        const detectedType = this.detectItalianVenueType(googlePlace);
        place = await this.saveOrUpdatePlace(googlePlace, detectedType);
        
        // Add the enhanced fields to the saved place
        place.photoUrls = googlePlace.photoUrls;
        place.openingHours = googlePlace.openingHours;
        place.photos = googlePlace.photos || [];
        place.reviews = includeReviews ? (googlePlace.reviews || []) : [];
      }

      // Format response
      const formatted = formatPlace(place, userLocation);
      
      // Add Italian enhancements
      formatted.emoji = this.getItalianVenueEmoji(formatted.placeType, formatted.name);
      formatted.displayType = this.getItalianVenueDisplayType(formatted.placeType);

      // ENHANCED: Ensure photo URLs and opening hours are included
      formatted.photoUrls = place.photoUrls || this.generatePhotoUrls([]);
      formatted.openingHours = place.openingHours;
      formatted.photos = place.photos || [];
      formatted.reviews = place.reviews || [];

      // Add distance if user location provided
      if (userLocation && formatted.location) {
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          formatted.location.latitude,
          formatted.location.longitude
        );
        formatted.distance = Math.round(distance);
        formatted.formattedDistance = formatDistance(distance);
      }

      // Cache the result
      if (SERVICE_CONFIG.cacheEnabled) {
        await redisService.cachePlaceDetails(placeId, formatted);
      }

      console.log('✅ PLACE DETAILS RETRIEVED WITH PHOTOS AND HOURS:', {
        placeId,
        name: formatted.name,
        hasPhotos: !!(formatted.photoUrls && Object.keys(formatted.photoUrls).some(size => formatted.photoUrls[size].length > 0)),
        hasHours: !!formatted.openingHours,
        hasPhone: !!formatted.phoneNumber,
        hasWebsite: !!formatted.website
      });

      return formatted;

    } catch (error) {
      console.error('❌ FAILED TO GET PLACE DETAILS:', error);
      logger.error('Failed to get place details', {
        placeId,
        error: error.message
      });
      throw error;
    }
  }

  // Format places response with Italian enhancements
  async formatPlacesResponse(places, userLocation = null, limit = 20) {
    console.log('📋 FORMATTING RESPONSE:', {
      placesCount: places.length,
      hasUserLocation: !!userLocation,
      limit
    });

    let formattedPlaces = places.map(place => {
      const formatted = formatPlace(place, userLocation);
      
      // Add Italian-specific enhancements
      formatted.emoji = this.getItalianVenueEmoji(formatted.placeType, formatted.name);
      formatted.displayType = this.getItalianVenueDisplayType(formatted.placeType);
      
      return formatted;
    });

    // Better sorting for Italian venues
    if (userLocation && userLocation.latitude && userLocation.longitude) {
      formattedPlaces = formattedPlaces.sort((a, b) => {
        // Prioritize very close venues first
        const aDistance = a.distance || Infinity;
        const bDistance = b.distance || Infinity;
        
        // If both are very close (< 300m), sort by rating
        if (aDistance < 300 && bDistance < 300) {
          return (b.rating || 0) - (a.rating || 0);
        }
        
        // Otherwise sort by distance
        return aDistance - bDistance;
      });
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
      hasUserLocation: !!response.userLocation,
      veryClose: formattedPlaces.filter(p => p.distance && p.distance < 300).length
    });

    return response;
  }

  // Italian venue emoji mapping
  getItalianVenueEmoji(placeType, name) {
    const nameLower = (name || '').toLowerCase();
    
    // Specific Italian venue types
    if (nameLower.includes('gelateria') || nameLower.includes('gelato')) return '🍦';
    if (nameLower.includes('pizzeria') || nameLower.includes('pizza')) return '🍕';
    if (nameLower.includes('pasticceria') || nameLower.includes('dolc')) return '🧁';
    if (nameLower.includes('panetteria') || nameLower.includes('pane')) return '🥖';
    if (nameLower.includes('birreria') || nameLower.includes('pub')) return '🍺';
    
    // Default by type
    switch (placeType) {
      case 'pub': return '🍺';
      case 'restaurant': return '🍽️';
      case 'cafe':
      default: return '☕';
    }
  }

  // Italian venue display types
  getItalianVenueDisplayType(placeType) {
    switch (placeType) {
      case 'cafe': return 'Bar/Caffetteria';
      case 'pub': return 'Pub/Locale Notturno';
      case 'restaurant': return 'Ristorante';
      default: return 'Locale';
    }
  }

  // Search by text
  async searchByText(query, options = {}) {
    try {
      if (!query || query.trim().length < 2) {
        return { places: [], count: 0 };
      }

      const {
        latitude,
        longitude,
        limit = 20,
        userLocation = null
      } = options;

      console.log('🔍 SEARCHING PLACES BY TEXT:', { query, latitude, longitude });

      // Check cache first
      if (SERVICE_CONFIG.cacheEnabled) {
        const cacheKey = `text_search:${query.trim()}:${latitude}:${longitude}`;
        const cachedResult = await redisService.getTextSearch(query, latitude, longitude);
        
        if (cachedResult) {
          console.log('📦 TEXT SEARCH CACHE HIT');
          return this.formatPlacesResponse(cachedResult, userLocation, limit);
        }
      }

      // Search Google Places
      const places = await searchPlacesByText(query.trim(), latitude, longitude);
      
      // Process places
      const processedPlaces = await this.processAndSavePlaces(places, null);

      // Cache results
      if (SERVICE_CONFIG.cacheEnabled && processedPlaces.length > 0) {
        await redisService.cacheTextSearch(query, latitude, longitude, processedPlaces);
      }

      console.log('✅ TEXT SEARCH COMPLETED:', {
        query,
        resultCount: processedPlaces.length
      });

      return this.formatPlacesResponse(processedPlaces, userLocation, limit);

    } catch (error) {
      console.error('❌ TEXT SEARCH FAILED:', error);
      logger.error('Text search failed', {
        query,
        options,
        error: error.message
      });
      throw error;
    }
  }

  // Get popular places
  async getPopularPlaces(type, options = {}) {
    try {
      const {
        limit = 10,
        minRating = 4.0,
        userLocation = null
      } = options;

      console.log('⭐ GETTING POPULAR PLACES:', { type, minRating, limit });

      // Get from database with high ratings
      const places = await prisma.place.findMany({
        where: {
          placeType: this.mapPlaceType(type),
          rating: {
            gte: minRating
          },
          isActive: true
        },
        orderBy: [
          { rating: 'desc' },
          { lastUpdated: 'desc' }
        ],
        take: limit * 2 // Get more to filter
      });

      console.log('✅ POPULAR PLACES FOUND:', {
        type,
        count: places.length,
        avgRating: places.reduce((sum, p) => sum + (p.rating || 0), 0) / places.length
      });

      return this.formatPlacesResponse(places.slice(0, limit), userLocation, limit);

    } catch (error) {
      console.error('❌ FAILED TO GET POPULAR PLACES:', error);
      logger.error('Failed to get popular places', {
        type,
        options,
        error: error.message
      });
      throw error;
    }
  }

  // Get Italian venue statistics
  async getItalianVenueStats() {
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
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
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
        }, {}),
        italianVenueTypes: {
          caffeterias: stats.find(s => s.placeType === 'cafe')?._count.id || 0,
          pubs: stats.find(s => s.placeType === 'pub')?._count.id || 0,
          restaurants: stats.find(s => s.placeType === 'restaurant')?._count.id || 0
        }
      };
    } catch (error) {
      logger.error('Failed to get places statistics', {
        error: error.message
      });
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const stats = await this.getItalianVenueStats();
      
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