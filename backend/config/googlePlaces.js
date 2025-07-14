// config/googlePlaces.js - OPTIMIZED FOR COST EFFICIENCY
// Location: /backend/config/googlePlaces.js

const { Client } = require('@googlemaps/google-maps-services-js');
const logger = require('../utils/logger');
const { cache } = require('./redis');

// Initialize Google Maps client
const googleMapsClient = new Client({});

// API call monitoring
let apiCallCounter = {
  totalCalls: 0,
  lastReset: Date.now(),
  callsThisHour: 0,
  estimatedCost: 0
};

const logApiCall = (endpoint, cost = 0.05) => {
  apiCallCounter.totalCalls++;
  apiCallCounter.callsThisHour++;
  apiCallCounter.estimatedCost += cost;
  
  const now = Date.now();
  if (now - apiCallCounter.lastReset > 3600000) { // Reset every hour
    console.log('📊 HOURLY API USAGE REPORT:', {
      callsThisHour: apiCallCounter.callsThisHour,
      estimatedHourlyCost: `€${(apiCallCounter.callsThisHour * 0.05).toFixed(2)}`,
      projectedDailyCost: `€${(apiCallCounter.callsThisHour * 0.05 * 24).toFixed(2)}`
    });
    apiCallCounter.callsThisHour = 0;
    apiCallCounter.lastReset = now;
  }
  
  console.log('💰 API CALL LOGGED:', {
    endpoint,
    totalToday: apiCallCounter.totalCalls,
    estimatedCost: `€${apiCallCounter.estimatedCost.toFixed(2)}`
  });
};

const getApiKey = () => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error('❌ GOOGLE_PLACES_API_KEY not found in environment variables');
    return null;
  }
  console.log('✅ Google Places API key loaded:', apiKey ? `${apiKey.substring(0, 8)}...` : 'MISSING');
  return apiKey;
};

// OPTIMIZED: Configuration for COST EFFICIENCY
const getConfig = () => ({
  apiKey: getApiKey(),
  defaultRadius: 2000,
  maxResults: 60,
  language: 'it',
  region: 'IT',
  
  // 🔧 EMERGENCY rate limiting to prevent cost overruns
  rateLimit: {
    maxRequestsPerMinute: 3, // REDUCED from 15 to 3 for emergency cost control
    requestsThisMinute: 0,
    lastResetTime: Date.now(),
    requestQueue: [],
    processing: false,
    backoffTime: 2000 // 2 second backoff
  },
  
  // SIMPLIFIED: Single place type mapping (no comprehensive search)
  placeTypes: {
    cafe: ['cafe'],
    restaurant: ['restaurant']
  },
  
  // Cache settings optimized for longer retention
  cache: {
    nearbySearch: 1800,   // 30 minutes for nearby searches (increased)
    placeDetails: 7200,   // 2 hours for place details (increased)
    photos: 86400,        // 24 hours for photo URLs
    textSearch: 3600      // 1 hour for text searches (increased)
  }
});

// OPTIMIZED: Single API call search function (replaces comprehensive search)
const searchAllVenuesComprehensive = async (latitude, longitude, type = 'cafe', radius = null) => {
  console.log('🔧 OPTIMIZED SEARCH - Using efficient single API call instead of comprehensive');
  
  const apiKey = getApiKey();
  const config = getConfig();
  
  if (!apiKey) {
    throw new Error('Google Places API key not configured');
  }

  const searchRadius = radius || config.defaultRadius;
  
  console.log('🔍 EFFICIENT SEARCH STARTING:', {
    latitude,
    longitude,
    type,
    searchRadius,
    strategies: 1 // Only 1 strategy now
  });

  // SINGLE API CALL instead of 10+
  const results = await makeRateLimitedRequest(async () => {
    return await googleMapsClient.placesNearby({
      params: {
        key: apiKey,
        location: { lat: latitude, lng: longitude },
        radius: searchRadius,
        type: type === 'cafe' ? 'cafe' : 'restaurant',
        language: config.language,
        region: config.region
      }
    });
  }, 'placesNearby');

  console.log(`✅ EFFICIENT SEARCH COMPLETED: ${results.data.results.length} places with 1 API call`);
  return results.data.results || [];
};

// Helper function to calculate distance to place
const calculateDistanceToPlace = (userLat, userLng, place) => {
  const placeLat = place.geometry?.location?.lat;
  const placeLng = place.geometry?.location?.lng;
  
  if (!placeLat || !placeLng) return Infinity;
  
  const R = 6371e3; // Earth's radius in meters
  const φ1 = userLat * Math.PI / 180;
  const φ2 = placeLat * Math.PI / 180;
  const Δφ = (placeLat - userLat) * Math.PI / 180;
  const Δλ = (placeLng - userLng) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Rate-limited request wrapper with monitoring
async function makeRateLimitedRequest(requestFunction, endpoint = 'unknown') {
  const config = getConfig();
  
  // Check rate limit
  const now = Date.now();
  const timeSinceReset = now - config.rateLimit.lastResetTime;
  
  if (timeSinceReset >= 60000) {
    config.rateLimit.requestsThisMinute = 0;
    config.rateLimit.lastResetTime = now;
  }
  
  if (config.rateLimit.requestsThisMinute >= config.rateLimit.maxRequestsPerMinute) {
    const waitTime = 60000 - timeSinceReset;
    console.log(`⏳ Rate limit reached, waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime + 100));
  }
  
  try {
    config.rateLimit.requestsThisMinute++;
    logApiCall(endpoint); // Log every API call for monitoring
    const result = await requestFunction();
    return result;
  } catch (error) {
    if (error.response?.status === 429) {
      console.log('🛑 API returned 429, implementing backoff');
      await new Promise(resolve => setTimeout(resolve, 5000));
      throw new Error('Rate limit exceeded. Please try again.');
    }
    throw error;
  }
}

// Export functions with monitoring support
module.exports = {
  googleMapsClient,
  getConfig,
  getApiKey,
  apiCallCounter, // Export for monitoring
  
  validateApiKey: async () => {
    const apiKey = getApiKey();
    if (!apiKey) return false;
    
    try {
      const response = await makeRateLimitedRequest(async () => {
        return await googleMapsClient.placesNearby({
          params: {
            key: apiKey,
            location: { lat: 45.0703, lng: 7.6869 },
            radius: 100,
            type: 'cafe'
          }
        });
      }, 'validateApiKey');
      
      return response.status === 200;
    } catch (error) {
      console.error('❌ API key validation failed:', error.message);
      return false;
    }
  },
  
  // MAIN EXPORT: Use optimized search instead of comprehensive search
  searchNearbyPlaces: searchAllVenuesComprehensive,
  
  // Keep existing functions for compatibility
  getPlaceDetails: async (placeId) => {
    const apiKey = getApiKey();
    const config = getConfig();
    
    if (!apiKey) {
      throw new Error('Google Places API key not configured');
    }

    const cacheKey = `details:${placeId}`;
    const cachedResult = await cache.get(cacheKey);
    if (cachedResult) {
      console.log('⚡ PLACE DETAILS CACHE HIT');
      return cachedResult;
    }
    
    const response = await makeRateLimitedRequest(async () => {
      return await googleMapsClient.placeDetails({
        params: {
          key: apiKey,
          place_id: placeId,
          fields: [
            'place_id', 'name', 'formatted_address', 'geometry',
            'rating', 'user_ratings_total', 'price_level', 'opening_hours',
            'formatted_phone_number', 'website', 'photos', 'reviews', 'types'
          ],
          language: config.language,
          region: config.region
        }
      });
    }, 'placeDetails');
    
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
      website: place.website,
      types: place.types,
      openingHours: place.opening_hours,
      photos: place.photos || [],
      reviews: place.reviews || []
    };
    
    await cache.set(cacheKey, placeDetails, config.cache.placeDetails);
    return placeDetails;
  },
  
  searchPlacesByText: async (query, latitude = null, longitude = null) => {
    const apiKey = getApiKey();
    const config = getConfig();
    
    if (!apiKey) {
      throw new Error('Google Places API key not configured');
    }

    const params = {
      key: apiKey,
      query: query,
      language: config.language,
      region: config.region
    };
    
    if (latitude && longitude) {
      params.location = { lat: latitude, lng: longitude };
      params.radius = config.defaultRadius;
    }
    
    const response = await makeRateLimitedRequest(async () => {
      return await googleMapsClient.textSearch({ params });
    }, 'textSearch');
    
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
    
    return places;
  },
  
  getPhotoUrl: (photoReference, maxWidth = 400, maxHeight = 400) => {
    const apiKey = getApiKey();
    if (!photoReference || !apiKey) return null;
    
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&maxheight=${maxHeight}&photoreference=${photoReference}&key=${apiKey}`;
  },
  
  healthCheck: async () => {
    try {
      const apiKey = getApiKey();
      const config = getConfig();
      
      if (!apiKey) {
        return { status: 'unhealthy', error: 'API key not configured' };
      }

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        apiKey: 'configured',
        rateLimit: {
          requestsThisMinute: config.rateLimit.requestsThisMinute,
          maxRequestsPerMinute: config.rateLimit.maxRequestsPerMinute
        },
        monitoring: {
          totalCallsToday: apiCallCounter.totalCalls,
          estimatedCost: `€${apiCallCounter.estimatedCost.toFixed(2)}`
        }
      };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
};