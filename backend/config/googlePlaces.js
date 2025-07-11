// config/googlePlaces.js - ENHANCED FOR MAXIMUM COVERAGE
// Location: /backend/config/googlePlaces.js

const { Client } = require('@googlemaps/google-maps-services-js');
const logger = require('../utils/logger');
const { cache } = require('./redis');

// Initialize Google Maps client
const googleMapsClient = new Client({});

const getApiKey = () => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error('❌ GOOGLE_PLACES_API_KEY not found in environment variables');
    return null;
  }
  console.log('✅ Google Places API key loaded:', apiKey ? `${apiKey.substring(0, 8)}...` : 'MISSING');
  return apiKey;
};

// ENHANCED: Configuration for MAXIMUM COVERAGE
const getConfig = () => ({
  apiKey: getApiKey(),
  defaultRadius: 2000,
  maxResults: 60,
  language: 'it',
  region: 'IT',
  
  // 🔧 REDUCED rate limiting to prevent 429 errors
  rateLimit: {
    maxRequestsPerMinute: 15, // REDUCED from 30 to 15
    requestsThisMinute: 0,
    lastResetTime: Date.now(),
    requestQueue: [],
    processing: false,
    backoffTime: 1000 // 1 second backoff
  },
  
  // ENHANCED: Comprehensive place type mappings for ALL Italian venues
  placeTypes: {
    // EXPANDED cafe mapping to catch ALL Italian bars/cafes
    cafe: [
      'cafe', 'bar', 'bakery', 'establishment',
      'food', 'point_of_interest', 'store'
    ],
    
    // EXPANDED restaurant mapping to catch ALL Italian restaurants
    restaurant: [
      'restaurant', 'meal_delivery', 'meal_takeaway', 
      'food', 'establishment', 'point_of_interest'
    ]
  },
  
  // ENHANCED: Multiple search strategies for comprehensive coverage
  searchStrategies: {
    // Primary search with main types
    primary: {
      cafe: ['cafe', 'bar'],
      restaurant: ['restaurant', 'food']
    },
    
    // Secondary search with broader types
    secondary: {
      cafe: ['bakery', 'establishment'],
      restaurant: ['meal_delivery', 'meal_takeaway']
    },
    
    // Text-based search for Italian venue names
    textSearch: {
      cafe: ['bar', 'caffè', 'caffe', 'caffetteria', 'pasticceria'],
      restaurant: ['ristorante', 'pizzeria', 'trattoria', 'osteria']
    }
  },
  
  // Cache settings optimized for comprehensive searches
  cache: {
    nearbySearch: 600,    // 10 minutes for nearby searches
    placeDetails: 1800,   // 30 minutes for place details
    photos: 86400,        // 24 hours for photo URLs
    textSearch: 1200      // 20 minutes for text searches
  }
});

// ENHANCED: Comprehensive search function that gets ALL venues
const searchAllVenuesComprehensive = async (latitude, longitude, type = 'cafe', radius = null) => {
  try {
    const apiKey = getApiKey();
    const config = getConfig();
    
    if (!apiKey) {
      throw new Error('Google Places API key not configured');
    }

    const searchRadius = radius || config.defaultRadius;
    const allResults = new Map(); // Use Map to avoid duplicates by place_id
    
    console.log('🔍 COMPREHENSIVE SEARCH STARTING:', {
      latitude,
      longitude, 
      type,
      searchRadius,
      strategies: Object.keys(config.searchStrategies).length
    });

    // STRATEGY 1: Primary type search
    console.log('📍 Strategy 1: Primary type search');
    const primaryTypes = config.searchStrategies.primary[type] || [type];
    
    for (const searchType of primaryTypes) {
      try {
        const results = await makeRateLimitedRequest(async () => {
          return await googleMapsClient.placesNearby({
            params: {
              key: apiKey,
              location: { lat: latitude, lng: longitude },
              radius: searchRadius,
              type: searchType,
              language: config.language,
              region: config.region
            }
          });
        });
        
        if (results.data.results) {
          results.data.results.forEach(place => {
            allResults.set(place.place_id, place);
          });
          
          console.log(`✅ Primary search (${searchType}): ${results.data.results.length} results`);
        }
      } catch (error) {
        console.warn(`⚠️ Primary search failed for ${searchType}:`, error.message);
      }
    }

    // STRATEGY 2: Secondary type search
    console.log('📍 Strategy 2: Secondary type search');
    const secondaryTypes = config.searchStrategies.secondary[type] || [];
    
    for (const searchType of secondaryTypes) {
      try {
        const results = await makeRateLimitedRequest(async () => {
          return await googleMapsClient.placesNearby({
            params: {
              key: apiKey,
              location: { lat: latitude, lng: longitude },
              radius: searchRadius,
              type: searchType,
              language: config.language,
              region: config.region
            }
          });
        });
        
        if (results.data.results) {
          results.data.results.forEach(place => {
            allResults.set(place.place_id, place);
          });
          
          console.log(`✅ Secondary search (${searchType}): ${results.data.results.length} results`);
        }
      } catch (error) {
        console.warn(`⚠️ Secondary search failed for ${searchType}:`, error.message);
      }
    }

    // STRATEGY 3: Text-based search for Italian venues
    console.log('📍 Strategy 3: Italian text search');
    const textQueries = config.searchStrategies.textSearch[type] || [];
    
    for (const query of textQueries) {
      try {
        const results = await makeRateLimitedRequest(async () => {
          return await googleMapsClient.textSearch({
            params: {
              key: apiKey,
              query: query,
              location: { lat: latitude, lng: longitude },
              radius: searchRadius,
              language: config.language,
              region: config.region
            }
          });
        });
        
        if (results.data.results) {
          results.data.results.forEach(place => {
            // Only add if within radius
            const distance = calculateDistanceToPlace(latitude, longitude, place);
            if (distance <= searchRadius) {
              allResults.set(place.place_id, place);
            }
          });
          
          console.log(`✅ Text search (${query}): ${results.data.results.length} results`);
        }
      } catch (error) {
        console.warn(`⚠️ Text search failed for ${query}:`, error.message);
      }
    }

    // STRATEGY 4: Broader establishment search
    console.log('📍 Strategy 4: Broader establishment search');
    try {
      const results = await makeRateLimitedRequest(async () => {
        return await googleMapsClient.placesNearby({
          params: {
            key: apiKey,
            location: { lat: latitude, lng: longitude },
            radius: searchRadius,
            type: 'establishment',
            language: config.language,
            region: config.region
          }
        });
      });
      
      if (results.data.results) {
        // Filter establishment results to match our venue type
        const filtered = results.data.results.filter(place => {
          const placeTypes = place.types || [];
          const name = (place.name || '').toLowerCase();
          
          if (type === 'cafe') {
            return placeTypes.some(t => ['cafe', 'bar', 'bakery'].includes(t)) ||
                   name.includes('bar') || name.includes('caffè') || name.includes('caffe');
          } else if (type === 'restaurant') {
            return placeTypes.some(t => ['restaurant', 'food', 'meal_delivery'].includes(t)) ||
                   name.includes('ristorante') || name.includes('pizzeria') || name.includes('trattoria');
          }
          return false;
        });
        
        filtered.forEach(place => {
          allResults.set(place.place_id, place);
        });
        
        console.log(`✅ Establishment search: ${filtered.length} relevant results`);
      }
    } catch (error) {
      console.warn('⚠️ Establishment search failed:', error.message);
    }

    // Convert Map back to Array and format results
    const finalResults = Array.from(allResults.values()).map(place => {
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
      
      return mappedPlace;
    });

    console.log('🎉 COMPREHENSIVE SEARCH COMPLETED:', {
      totalUniqueVenues: finalResults.length,
      searchRadius: searchRadius,
      strategiesUsed: 4,
      type: type
    });

    return finalResults;
    
  } catch (error) {
    console.error('❌ COMPREHENSIVE SEARCH FAILED:', error);
    throw error;
  }
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

// Rate-limited request wrapper (unchanged but essential)
async function makeRateLimitedRequest(requestFunction) {
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

// Export the comprehensive search function and existing functions
module.exports = {
  googleMapsClient,
  getConfig,
  getApiKey,
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
      });
      
      return response.status === 200;
    } catch (error) {
      console.error('❌ API key validation failed:', error.message);
      return false;
    }
  },
  
  // MAIN EXPORT: Use comprehensive search instead of simple search
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
    });
    
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
    });
    
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
        }
      };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
};