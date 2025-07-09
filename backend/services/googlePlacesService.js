// services/googlePlacesService.js - COMPLETELY FIXED VERSION
// Location: /backend/services/googlePlacesService.js

const { prisma } = require('../config/prisma');
const { 
  searchNearbyPlaces, 
  getPlaceDetails, 
  searchPlacesByText,
  getPhotoUrl,
  validateApiKey,
  getConfig,
  getApiKey
} = require('../config/googlePlaces');
const redisService = require('./redisService');
const logger = require('../utils/logger');
const { formatPlace, calculateDistance, formatDistance } = require('../utils/helpers');
const { isValidLatitude, isValidLongitude, isValidPlaceType } = require('../utils/validators');

// UPDATED: Configuration for Italian venues (no pubs)
const SERVICE_CONFIG = {
  defaultRadius: 1000,
  maxRadius: 50000,
  maxResults: 25,
  cacheEnabled: true,
  batchSize: 20,
  
  // UPDATED: Removed pub mapping - only cafe and restaurant
  placeTypeMapping: {
    cafe: ['cafe', 'bar', 'bakery'], // Italian bars are cafes
    restaurant: ['restaurant', 'meal_delivery', 'meal_takeaway', 'food', 'establishment']
    // REMOVED: pub: ['bar', 'night_club', 'liquor_store', 'establishment']
  },
  
  requiredFields: ['googlePlaceId', 'name', 'latitude', 'longitude'],
  
  photoSizes: {
    thumbnail: { width: 200, height: 200 },
    medium: { width: 400, height: 400 },
    large: { width: 800, height: 600 }
  },

  // UPDATED: Italian-specific keywords (removed pub keywords)
  italianVenueKeywords: {
    cafe: ['bar', 'caffe', 'caffè', 'caffetteria', 'pasticceria', 'gelateria'],
    restaurant: ['ristorante', 'pizzeria', 'trattoria', 'osteria', 'tavola calda']
    // REMOVED: pub: ['pub', 'birreria', 'disco', 'club', 'locale notturno', 'beer', 'birra']
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

  async initialize() {
    try {
      console.log('🔧 Initializing Google Places Service...');
      
      // Check if API key is configured
      const apiKey = getApiKey();
      if (!apiKey) {
        console.error('❌ Google Places API key not configured');
        this.isInitialized = true; // Mark as initialized but not valid
        this.apiKeyValid = false;
        return false;
      }

      console.log('🔑 API Key found, validating...');
      this.apiKeyValid = await validateApiKey();
      this.isInitialized = true;
      
      if (this.apiKeyValid) {
        console.log('✅ Google Places Service initialized successfully');
        logger.info('Google Places Service initialized', {
          apiKeyValid: this.apiKeyValid
        });
        return true;
      } else {
        console.log('⚠️ Google Places Service initialized with invalid API key');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize Google Places Service:', error);
      logger.error('Failed to initialize Google Places Service', {
        error: error.message
      });
      this.isInitialized = true; // Mark as initialized but failed
      this.apiKeyValid = false;
      return false;
    }
  }

  validatePlaceData(place) {
    if (!place) {
      console.log('❌ VALIDATION: Place is null/undefined');
      return false;
    }

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

  formatOpeningHours(openingHours) {
    if (!openingHours) {
      return null;
    }

    const formatted = {
      openNow: openingHours.open_now || openingHours.openNow || false,
      periods: openingHours.periods || [],
      weekdayText: openingHours.weekday_text || openingHours.weekdayText || []
    };

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

  async searchNearby(latitude, longitude, options = {}) {
    try {
      console.log('🚀 SEARCH NEARBY CALLED:', { latitude, longitude, options });

      // Check if service is initialized
      if (!this.isInitialized) {
        console.log('⚠️ Service not initialized, initializing now...');
        await this.initialize();
      }

      // If API key is invalid, return mock data for testing
      if (!this.apiKeyValid) {
        console.log('🧪 API key invalid, returning mock data for testing');
        return this.getMockPlaces(latitude, longitude, options);
      }

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

      const mappedType = this.mapPlaceType(type);

      console.log('🚀 STARTING NEARBY SEARCH:', {
        latitude: latitude.toFixed(4),
        longitude: longitude.toFixed(4),
        type: mappedType,
        radius,
        limit
      });

      if (SERVICE_CONFIG.cacheEnabled) {
        const cacheKey = `nearby:${Math.round(latitude * 1000)}:${Math.round(longitude * 1000)}:${radius}:${mappedType}`;
        const cachedResults = await redisService.getNearbyPlaces(latitude, longitude, radius, mappedType);
        
        if (cachedResults && cachedResults.length > 0) {
          console.log('📦 CACHE HIT - returning cached results:', cachedResults.length);
          return this.formatPlacesResponse(cachedResults, userLocation, limit);
        }
      }

      console.log('🌐 CALLING GOOGLE PLACES API...');
      
      const apiResults = await searchNearbyPlaces(latitude, longitude, mappedType, radius);
      console.log('📡 API RESPONSE:', { 
        totalPlaces: apiResults.length,
        validPlaces: apiResults.filter(p => this.validatePlaceData(p)).length
      });

      console.log('🔄 PROCESSING PLACES...');
      const processedPlaces = await this.processAndSavePlaces(apiResults, mappedType);
      console.log('✅ PROCESSED PLACES:', { 
        saved: processedPlaces.length,
        skipped: apiResults.length - processedPlaces.length
      });

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
      
      // Return mock data on error for testing
      console.log('🧪 Returning mock data due to error');
      return this.getMockPlaces(latitude, longitude, options);
    }
  }

  // UPDATED: Mock data for testing when API is unavailable
  getMockPlaces(latitude, longitude, options = {}) {
    const { type = 'cafe', limit = 20 } = options;
    
    const mockPlaces = [
      {
        id: 'mock-1',
        googlePlaceId: 'ChIJMock1',
        name: type === 'restaurant' ? 'Ristorante Il Convivio' : 'Caffè Centrale',
        address: 'Via Roma 1, Torino, TO, Italy',
        latitude: latitude + 0.001,
        longitude: longitude + 0.001,
        placeType: type,
        rating: 4.5,
        priceLevel: 2,
        businessStatus: 'OPERATIONAL',
        photos: [],
        distance: 150,
        formattedDistance: '150m'
      },
      {
        id: 'mock-2',
        googlePlaceId: 'ChIJMock2',
        name: type === 'restaurant' ? 'Trattoria da Mario' : 'Bar Lavazza',
        address: 'Piazza Castello 2, Torino, TO, Italy',
        latitude: latitude - 0.001,
        longitude: longitude - 0.001,
        placeType: type,
        rating: 4.2,
        priceLevel: 1,
        businessStatus: 'OPERATIONAL',
        photos: [],
        distance: 200,
        formattedDistance: '200m'
      }
    ];

    return this.formatPlacesResponse(mockPlaces.slice(0, limit), { latitude, longitude }, limit);
  }

  // UPDATED: Better Italian venue type mapping (removed pub)
  mapPlaceType(type) {
    const typeMapping = {
      'cafe': 'cafe',     // Italian bars/caffeterias
      'bar': 'cafe',      // Map to cafe for Italian context
      'restaurant': 'restaurant'
      // REMOVED: 'pub': 'pub'
    };
    
    return typeMapping[type] || 'cafe';
  }

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
          if (!this.validatePlaceData(place)) {
            console.log('❌ PLACE VALIDATION FAILED - SKIPPING');
            continue;
          }

          console.log('✅ PLACE VALIDATION PASSED - SAVING TO DB');

          const detectedType = this.detectItalianVenueType(place, placeType);
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

  // UPDATED: Enhanced Italian venue type detection (removed pub detection)
  detectItalianVenueType(place, fallbackType) {
    const name = (place.name || '').toLowerCase();
    const types = place.types || [];
    
    console.log('🏷️ TYPE DETECTION:', { 
      name: name.substring(0, 30), 
      types: types.slice(0, 5), 
      fallback: fallbackType 
    });
    
    // PRIORITY 1: Google Place types (most reliable)
    if (types.includes('restaurant') || types.includes('meal_delivery') || types.includes('meal_takeaway')) {
      console.log('🍽️ DETECTED AS RESTAURANT via Google types');
      return 'restaurant';
    }
    
    // PRIORITY 2: Italian name analysis (for local context)
    if (name.includes('ristorante') || name.includes('pizzeria') || name.includes('trattoria') || name.includes('osteria')) {
      console.log('🍽️ DETECTED AS RESTAURANT via Italian keywords');
      return 'restaurant';
    }
    
    // PRIORITY 3: Default to cafe (covers Italian bars/caffeterias)
    const finalType = fallbackType || 'cafe';
    console.log('☕ USING FALLBACK TYPE:', finalType);
    return finalType;
  }

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
      
      if (error.code === 'P2002') {
        console.log('⚠️ Duplicate place, updating existing...');
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

  async getPlaceById(placeId, options = {}) {
    try {
      if (!placeId) {
        throw new Error('Place ID is required');
      }

      const { userLocation, includeReviews = true } = options;

      console.log('📍 FETCHING PLACE DETAILS WITH PHOTOS AND HOURS:', { placeId, userLocation });

      if (SERVICE_CONFIG.cacheEnabled) {
        const cacheKey = `place_details:${placeId}`;
        const cachedResult = await redisService.getPlaceDetails(placeId);
        
        if (cachedResult) {
          console.log('📦 PLACE DETAILS CACHE HIT');
          
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

      let place = await prisma.place.findUnique({
        where: { googlePlaceId: placeId }
      });

      if (place) {
        console.log('💾 FOUND PLACE IN DATABASE, ENHANCING WITH GOOGLE DATA');
        
        // Only try to enhance with Google data if API key is valid
        if (this.apiKeyValid) {
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

            const photoUrls = this.generatePhotoUrls(googleDetails.photos);
            const formattedHours = this.formatOpeningHours(googleDetails.openingHours);

            const enhancedPlace = {
              ...place,
              ...googleDetails,
              id: place.id,
              googlePlaceId: place.googlePlaceId,
              lastUpdated: place.lastUpdated,
              photoUrls: photoUrls,
              openingHours: formattedHours,
              photos: googleDetails.photos || place.photos || [],
              phoneNumber: googleDetails.phoneNumber || place.phoneNumber,
              website: googleDetails.website || place.website,
              reviews: includeReviews ? (googleDetails.reviews || []) : []
            };

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
            place.photoUrls = this.generatePhotoUrls([]);
            place.openingHours = this.formatOpeningHours(place.openingHours);
          }
        } else {
          place.photoUrls = this.generatePhotoUrls([]);
          place.openingHours = this.formatOpeningHours(place.openingHours);
        }
      } else {
        if (!this.apiKeyValid) {
          throw new Error('Place not found and Google Places API unavailable');
        }

        console.log('🌐 PLACE NOT IN DATABASE, FETCHING FROM GOOGLE PLACES API');
        
        const googlePlace = await getPlaceDetails(placeId);
        
        if (!googlePlace) {
          throw new Error('Place not found');
        }

        googlePlace.photoUrls = this.generatePhotoUrls(googlePlace.photos);
        googlePlace.openingHours = this.formatOpeningHours(googlePlace.openingHours);

        const detectedType = this.detectItalianVenueType(googlePlace);
        place = await this.saveOrUpdatePlace(googlePlace, detectedType);
        
        place.photoUrls = googlePlace.photoUrls;
        place.openingHours = googlePlace.openingHours;
        place.photos = googlePlace.photos || [];
        place.reviews = includeReviews ? (googlePlace.reviews || []) : [];
      }

      const formatted = formatPlace(place, userLocation);
      
      // UPDATED: Italian enhancements (no pub emoji)
      formatted.emoji = this.getItalianVenueEmoji(formatted.placeType, formatted.name);
      formatted.displayType = this.getItalianVenueDisplayType(formatted.placeType);

      formatted.photoUrls = place.photoUrls || this.generatePhotoUrls([]);
      formatted.openingHours = place.openingHours;
      formatted.photos = place.photos || [];
      formatted.reviews = place.reviews || [];

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

  async formatPlacesResponse(places, userLocation = null, limit = 20) {
    console.log('📋 FORMATTING RESPONSE:', {
      placesCount: places.length,
      hasUserLocation: !!userLocation,
      limit
    });

    let formattedPlaces = places.map(place => {
      const formatted = formatPlace(place, userLocation);
      
      // UPDATED: Italian-specific enhancements (no pub)
      formatted.emoji = this.getItalianVenueEmoji(formatted.placeType, formatted.name);
      formatted.displayType = this.getItalianVenueDisplayType(formatted.placeType);
      
      return formatted;
    });

    if (userLocation && userLocation.latitude && userLocation.longitude) {
      formattedPlaces = formattedPlaces.sort((a, b) => {
        const aDistance = a.distance || Infinity;
        const bDistance = b.distance || Infinity;
        
        if (aDistance < 300 && bDistance < 300) {
          return (b.rating || 0) - (a.rating || 0);
        }
        
        if (a.distance < 500 && b.distance >= 500) return -1;
        if (b.distance < 500 && a.distance >= 500) return 1;
        
        return aDistance - bDistance;
      });
    }

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

  // UPDATED: Italian venue emoji mapping (removed pub emoji)
  getItalianVenueEmoji(placeType, name) {
    const nameLower = (name || '').toLowerCase();
    
    if (nameLower.includes('gelateria') || nameLower.includes('gelato')) return '🍦';
    if (nameLower.includes('pizzeria') || nameLower.includes('pizza')) return '🍕';
    if (nameLower.includes('pasticceria') || nameLower.includes('dolc')) return '🧁';
    if (nameLower.includes('panetteria') || nameLower.includes('pane')) return '🥖';
    
    // REMOVED: pub-specific emojis
    
    switch (placeType) {
      case 'restaurant': return '🍽️';
      case 'cafe':
      default: return '☕';
    }
  }

  // UPDATED: Italian venue display types (removed pub)
  getItalianVenueDisplayType(placeType) {
    switch (placeType) {
      case 'cafe': return 'Bar/Caffetteria';
      case 'restaurant': return 'Ristorante';
      default: return 'Locale';
    }
  }

  async searchByText(query, options = {}) {
    try {
      if (!query || query.trim().length < 2) {
        return { places: [], count: 0 };
      }

      // Check if service is initialized
      if (!this.isInitialized) {
        await this.initialize();
      }

      // If API key is invalid, return empty results
      if (!this.apiKeyValid) {
        console.log('⚠️ API key invalid, returning empty results for text search');
        return { places: [], count: 0 };
      }

      const {
        latitude,
        longitude,
        limit = 20,
        userLocation = null
      } = options;

      console.log('🔍 SEARCHING PLACES BY TEXT:', { query, latitude, longitude });

      if (SERVICE_CONFIG.cacheEnabled) {
        const cacheKey = `text_search:${query.trim()}:${latitude}:${longitude}`;
        const cachedResult = await redisService.getTextSearch(query, latitude, longitude);
        
        if (cachedResult) {
          console.log('📦 TEXT SEARCH CACHE HIT');
          return this.formatPlacesResponse(cachedResult, userLocation, limit);
        }
      }

      const places = await searchPlacesByText(query.trim(), latitude, longitude);
      const processedPlaces = await this.processAndSavePlaces(places, null);

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
      return { places: [], count: 0 };
    }
  }

  async getPopularPlaces(type, options = {}) {
    try {
      const {
        limit = 10,
        minRating = 4.0,
        userLocation = null
      } = options;

      console.log('⭐ GETTING POPULAR PLACES:', { type, minRating, limit });

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
        take: limit * 2
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

  // UPDATED: Italian venue statistics (removed pub stats)
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
        // UPDATED: Italian venue types (removed pubs)
        italianVenueTypes: {
          caffeterias: stats.find(s => s.placeType === 'cafe')?._count.id || 0,
          restaurants: stats.find(s => s.placeType === 'restaurant')?._count.id || 0
          // REMOVED: pubs: stats.find(s => s.placeType === 'pub')?._count.id || 0
        }
      };
    } catch (error) {
      logger.error('Failed to get places statistics', {
        error: error.message
      });
      
      // Return empty stats on error
      return {
        totalPlaces: 0,
        recentlyUpdated: 0,
        byType: {},
        italianVenueTypes: {
          caffeterias: 0,
          restaurants: 0
        }
      };
    }
  }

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