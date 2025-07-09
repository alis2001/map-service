// config/googlePlaces.js - COMPLETELY FIXED VERSION
// Location: /backend/config/googlePlaces.js

const { Client } = require('@googlemaps/google-maps-services-js');
const logger = require('../utils/logger');
const { cache } = require('./redis');

// Initialize Google Maps client
const googleMapsClient = new Client({});

// FIXED: Get API key directly from environment
const getApiKey = () => process.env.GOOGLE_PLACES_API_KEY;

// FIXED: Configuration with environment variable access
const getConfig = () => ({
  apiKey: getApiKey(),
  defaultRadius: 1500, // 1.5km default search radius
  maxResults: 20, // Maximum results per request
  language: 'it', // Italian language for better local results
  region: 'IT', // Italy region
  
  // Rate limiting configuration
  rateLimit: {
    maxRequestsPerMinute: 40, // Conservative limit
    requestsThisMinute: 0,
    lastResetTime: Date.now(),
    requestQueue: [],
    processing: false
  },
  
  // OPTIMIZED: Enhanced place type mappings for Italian venues
  placeTypes: {
    // Italian bars are cafes
    cafe: ['cafe', 'bar', 'bakery'],
    // Include bar for pubs + nightlife
    pub: ['bar', 'night_club', 'liquor_store', 'establishment'],
    restaurant: ['restaurant', 'meal_delivery', 'meal_takeaway', 'food', 'establishment']
  },
  
  // Cache settings with longer TTL to reduce API calls
  cache: {
    nearbySearch: 900, // 15 minutes for nearby searches
    placeDetails: 3600, // 1 hour for place details
    photos: 86400 // 24 hours for photo URLs
  }
});

// FIXED: Rate limiting manager with proper config access
class RateLimitManager {
  static resetCounterIfNeeded() {
    const config = getConfig();
    const now = Date.now();
    const timeSinceReset = now - config.rateLimit.lastResetTime;
    
    if (timeSinceReset >= 60000) { // Reset every minute
      config.rateLimit.requestsThisMinute = 0;
      config.rateLimit.lastResetTime = now;
      console.log('🔄 Rate limit counter reset');
    }
  }
  
  static canMakeRequest() {
    this.resetCounterIfNeeded();
    const config = getConfig();
    return config.rateLimit.requestsThisMinute < config.rateLimit.maxRequestsPerMinute;
  }
  
  static recordRequest() {
    this.resetCounterIfNeeded();
    const config = getConfig();
    config.rateLimit.requestsThisMinute++;
    console.log(`📊 API requests this minute: ${config.rateLimit.requestsThisMinute}/${config.rateLimit.maxRequestsPerMinute}`);
  }
  
  static async waitForRateLimit() {
    if (!this.canMakeRequest()) {
      const config = getConfig();
      const waitTime = 60000 - (Date.now() - config.rateLimit.lastResetTime);
      console.log(`⏳ Rate limit reached, waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime + 100));
    }
  }
}

// FIXED: Rate-limited request wrapper
async function makeRateLimitedRequest(requestFunction) {
  await RateLimitManager.waitForRateLimit();
  
  try {
    RateLimitManager.recordRequest();
    const result = await requestFunction();
    return result;
  } catch (error) {
    if (error.response?.status === 429) {
      console.log('🛑 API returned 429, implementing backoff');
      await new Promise(resolve => setTimeout(resolve, 5000));
      throw new Error('Troppe richieste. Riprova tra qualche secondo.');
    }
    throw error;
  }
}

// FIXED: Validate API key on startup
const validateApiKey = async () => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    logger.error('Google Places API key is not configured');
    return false;
  }
  
  try {
    // Test API key with a simple request
    const response = await makeRateLimitedRequest(async () => {
      return await googleMapsClient.placesNearby({
        params: {
          key: apiKey, // ✅ FIXED
          location: { lat: 45.0703, lng: 7.6869 }, // Turin coordinates
          radius: 100,
          type: 'cafe'
        }
      });
    });
    
    if (response.status === 200) {
      logger.info('Google Places API key validated successfully');
      return true;
    } else {
      logger.error('Google Places API key validation failed', {
        status: response.status,
        statusText: response.statusText
      });
      return false;
    }
  } catch (error) {
    logger.error('Google Places API key validation error', {
      error: error.message,
      code: error.code
    });
    return false;
  }
};

// FIXED: Search for nearby places with proper environment variable access
const searchNearbyPlaces = async (latitude, longitude, type = 'cafe', radius = null) => {
  try {
    const apiKey = getApiKey();
    const config = getConfig();
    
    if (!apiKey) {
      throw new Error('Google Places API key not configured');
    }

    const searchRadius = radius || config.defaultRadius;
    const cacheKey = `nearby:${latitude}:${longitude}:${type}:${searchRadius}`;
    
    console.log('🚀 STARTING GOOGLE PLACES SEARCH:', {
      latitude,
      longitude, 
      type,
      searchRadius,
      apiKey: apiKey ? 'SET' : 'MISSING'
    });
    
    // Check cache first with longer retention
    const cachedResult = await cache.get(cacheKey);
    if (cachedResult) {
      console.log('📦 RETURNING CACHED RESULT:', { count: cachedResult.length });
      logger.debug('Returning cached nearby places', { 
        cacheKey, 
        count: cachedResult.length 
      });
      return cachedResult;
    }
    
    console.log('🌐 MAKING RATE-LIMITED GOOGLE PLACES API CALL...');
    
    // FIXED: Determine place types to search for Italian venues
    const placeTypesToSearch = config.placeTypes[type] || [type];
    console.log('🔍 PLACE TYPES TO SEARCH:', placeTypesToSearch);
    
    // FIXED: Simple, working API call without variable conflicts
    const response = await makeRateLimitedRequest(async () => {
      return await googleMapsClient.placesNearby({
        params: {
          key: apiKey, // ✅ FIXED
          location: { lat: latitude, lng: longitude },
          radius: searchRadius,
          type: placeTypesToSearch[0], // Primary type
          language: config.language,
          region: config.region
        }
      });
    });
    
    console.log('📡 GOOGLE PLACES API RESPONSE:', {
      status: response.status,
      statusText: response.statusText,
      resultCount: response.data?.results?.length || 0,
      googleStatus: response.data?.status,
      errorMessage: response.data?.error_message
    });
    
    if (response.status !== 200) {
      throw new Error(`Google Places API error: ${response.status} ${response.statusText}`);
    }

    // FIXED: Process results with proper variable declaration
    const apiResults = response.data.results || [];
    
    // DEBUG: Log the full API response
    logger.debug('Google Places API Response', {
      status: response.status,
      resultCount: apiResults.length,
      statusMessage: response.data.status,
      nextPageToken: response.data.next_page_token,
      firstResult: apiResults[0]
    });
    
    // FIXED: Map places with proper variable scope
    const formattedPlaces = apiResults.map(place => {
      console.log('🔍 RAW GOOGLE PLACE:', {
        place_id: place.place_id,
        name: place.name,
        geometry: place.geometry,
        vicinity: place.vicinity,
        types: place.types?.slice(0, 3)
      });
      
      const mappedPlace = {
        googlePlaceId: place.place_id,
        name: place.name,
        address: place.vicinity || place.formatted_address || '',
        latitude: place.geometry?.location?.lat,
        longitude: place.geometry?.location?.lng,
        rating: place.rating,
        priceLevel: place.price_level,
        types: place.types,
        businessStatus: place.business_status,
        photos: place.photos ? place.photos.map(photo => ({
          photoReference: photo.photo_reference,
          width: photo.width,
          height: photo.height
        })) : [],
        openingHours: place.opening_hours ? {
          openNow: place.opening_hours.open_now,
          periods: place.opening_hours.periods,
          weekdayText: place.opening_hours.weekday_text
        } : null,
        plusCode: place.plus_code,
        userRatingsTotal: place.user_ratings_total
      };
      
      console.log('🔧 MAPPED PLACE:', {
        googlePlaceId: mappedPlace.googlePlaceId,
        name: mappedPlace.name,
        latitude: mappedPlace.latitude,
        longitude: mappedPlace.longitude,
        address: mappedPlace.address
      });
      
      return mappedPlace;
    });
    
    // Cache the results with longer TTL
    await cache.set(cacheKey, formattedPlaces, config.cache.nearbySearch);
    
    logger.info('Nearby places search completed', {
      latitude,
      longitude,
      type,
      radius: searchRadius,
      resultCount: formattedPlaces.length
    });
    
    return formattedPlaces;
    
  } catch (error) {
    console.log('❌ GOOGLE PLACES API ERROR:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    
    logger.error('Nearby places search failed', {
      latitude,
      longitude,
      type,
      radius,
      error: error.message
    });
    throw error;
  }
};

// FIXED: Get place details with rate limiting
const getPlaceDetails = async (placeId) => {
  try {
    const apiKey = getApiKey();
    const config = getConfig();
    
    if (!apiKey) {
      throw new Error('Google Places API key not configured');
    }

    const cacheKey = `details:${placeId}`;
    
    // Check cache first
    const cachedResult = await cache.get(cacheKey);
    if (cachedResult) {
      logger.debug('Returning cached place details', { placeId });
      return cachedResult;
    }
    
    // FIXED: Fetch place details with rate limiting
    const response = await makeRateLimitedRequest(async () => {
      return await googleMapsClient.placeDetails({
        params: {
          key: apiKey, // ✅ FIXED
          place_id: placeId,
          fields: [
            'place_id',
            'name',
            'formatted_address',
            'geometry',
            'rating',
            'user_ratings_total',
            'price_level',
            'opening_hours',
            'formatted_phone_number',
            'international_phone_number',
            'website',
            'photos',
            'reviews',
            'types',
            'business_status',
            'plus_code'
          ],
          language: config.language,
          region: config.region
        }
      });
    });
    
    if (response.status !== 200) {
      throw new Error(`Google Places API error: ${response.status} ${response.statusText}`);
    }
    
    const place = response.data.result;
    const placeDetails = {
      googlePlaceId: place.place_id,
      name: place.name,
      address: place.formatted_address,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      priceLevel: place.price_level,
      phoneNumber: place.formatted_phone_number,
      internationalPhoneNumber: place.international_phone_number,
      website: place.website,
      businessStatus: place.business_status,
      types: place.types,
      plusCode: place.plus_code,
      openingHours: place.opening_hours ? {
        openNow: place.opening_hours.open_now,
        periods: place.opening_hours.periods,
        weekdayText: place.opening_hours.weekday_text
      } : null,
      photos: place.photos ? place.photos.map(photo => ({
        photoReference: photo.photo_reference,
        width: photo.width,
        height: photo.height
      })) : [],
      reviews: place.reviews ? place.reviews.map(review => ({
        authorName: review.author_name,
        authorUrl: review.author_url,
        language: review.language,
        profilePhotoUrl: review.profile_photo_url,
        rating: review.rating,
        relativeTimeDescription: review.relative_time_description,
        text: review.text,
        time: review.time
      })) : []
    };
    
    // Cache the results
    await cache.set(cacheKey, placeDetails, config.cache.placeDetails);
    
    logger.info('Place details retrieved successfully', { placeId });
    return placeDetails;
    
  } catch (error) {
    logger.error('Place details retrieval failed', {
      placeId,
      error: error.message
    });
    throw error;
  }
};

// FIXED: Get photo URL
const getPhotoUrl = (photoReference, maxWidth = 400, maxHeight = 400) => {
  if (!photoReference) {
    return null;
  }
  
  const apiKey = getApiKey();
  if (!apiKey) {
    return null;
  }
  
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&maxheight=${maxHeight}&photoreference=${photoReference}&key=${apiKey}`;
};

// FIXED: Search places by text
const searchPlacesByText = async (query, latitude = null, longitude = null) => {
  try {
    const apiKey = getApiKey();
    const config = getConfig();
    
    if (!apiKey) {
      throw new Error('Google Places API key not configured');
    }

    const cacheKey = `textsearch:${query}:${latitude}:${longitude}`;
    
    // Check cache first
    const cachedResult = await cache.get(cacheKey);
    if (cachedResult) {
      logger.debug('Returning cached text search results', { query });
      return cachedResult;
    }
    
    const params = {
      key: apiKey, // ✅ FIXED
      query: query,
      language: config.language,
      region: config.region
    };
    
    // Add location bias if coordinates provided
    if (latitude && longitude) {
      params.location = { lat: latitude, lng: longitude };
      params.radius = config.defaultRadius;
    }
    
    const response = await makeRateLimitedRequest(async () => {
      return await googleMapsClient.textSearch({ params });
    });
    
    if (response.status !== 200) {
      throw new Error(`Google Places API error: ${response.status} ${response.statusText}`);
    }
    
    const places = response.data.results.map(place => ({
      googlePlaceId: place.place_id,
      name: place.name,
      address: place.formatted_address,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      rating: place.rating,
      priceLevel: place.price_level,
      types: place.types,
      businessStatus: place.business_status,
      photos: place.photos ? place.photos.slice(0, 3) : [],
      openingHours: place.opening_hours
    }));
    
    // Cache the results
    await cache.set(cacheKey, places, config.cache.nearbySearch);
    
    logger.info('Text search completed', {
      query,
      latitude,
      longitude,
      resultCount: places.length
    });
    
    return places;
    
  } catch (error) {
    logger.error('Text search failed', {
      query,
      latitude,
      longitude,
      error: error.message
    });
    throw error;
  }
};

// FIXED: Health check for Google Places API
const healthCheck = async () => {
  try {
    const apiKey = getApiKey();
    const config = getConfig();
    
    if (!apiKey) {
      return {
        status: 'unhealthy',
        error: 'API key not configured',
        timestamp: new Date().toISOString()
      };
    }

    await validateApiKey();
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      apiKey: 'configured',
      rateLimit: {
        requestsThisMinute: config.rateLimit.requestsThisMinute,
        maxRequestsPerMinute: config.rateLimit.maxRequestsPerMinute,
        resetTime: config.rateLimit.lastResetTime
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
      apiKey: getApiKey() ? 'configured' : 'missing'
    };
  }
};

module.exports = {
  googleMapsClient,
  getConfig,
  getApiKey,
  validateApiKey,
  searchNearbyPlaces,
  getPlaceDetails,
  getPhotoUrl,
  searchPlacesByText,
  healthCheck,
  RateLimitManager
};