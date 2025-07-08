// config/googlePlaces.js
// Location: /backend/config/googlePlaces.js

const { Client } = require('@googlemaps/google-maps-services-js');
const logger = require('../utils/logger');
const { cache } = require('./redis');

// Initialize Google Maps client
const googleMapsClient = new Client({});

// Configuration
const config = {
  apiKey: process.env.GOOGLE_PLACES_API_KEY,
  defaultRadius: 1500, // 1.5km default search radius
  maxResults: 20, // Maximum results per request
  language: 'en', // Default language
  region: 'IT', // Italy region (since user is in Turin)
  
  // Supported place types
  placeTypes: {
    cafe: ['cafe', 'bakery', 'meal_takeaway'],
    bar: ['bar', 'night_club', 'liquor_store'],
    restaurant: ['restaurant', 'meal_delivery', 'meal_takeaway']
  },
  
  // Cache settings
  cache: {
    nearbySearch: 300, // 5 minutes for nearby searches
    placeDetails: 3600, // 1 hour for place details
    photos: 86400 // 24 hours for photo URLs
  }
};

// Validate API key on startup
const validateApiKey = async () => {
  if (!config.apiKey) {
    logger.error('Google Places API key is not configured');
    return false;
  }
  
  try {
    // Test API key with a simple request
    const response = await googleMapsClient.placesNearby({
      params: {
        key: config.apiKey,
        location: { lat: 45.0703, lng: 7.6869 }, // Turin coordinates
        radius: 100,
        type: 'cafe'
      }
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

// Search for nearby places
const searchNearbyPlaces = async (latitude, longitude, type = 'cafe', radius = null) => {
  try {
    const searchRadius = radius || config.defaultRadius;
    const cacheKey = `nearby:${latitude}:${longitude}:${type}:${searchRadius}`;
    
    console.log('🚀 STARTING GOOGLE PLACES SEARCH:', {
      latitude,
      longitude, 
      type,
      searchRadius,
      apiKey: config.apiKey ? 'SET' : 'MISSING'
    });
    
    // Check cache first
    const cachedResult = await cache.get(cacheKey);
    if (cachedResult) {
      console.log('📦 RETURNING CACHED RESULT:', { count: cachedResult.length });
      logger.debug('Returning cached nearby places', { 
        cacheKey, 
        count: cachedResult.length 
      });
      return cachedResult;
    }
    
    console.log('🌐 MAKING GOOGLE PLACES API CALL...');
    
    // Determine place types to search for
    const placeTypesToSearch = config.placeTypes[type] || [type];
    console.log('🔍 PLACE TYPES TO SEARCH:', placeTypesToSearch);
    
    // Search for places
    const response = await googleMapsClient.placesNearby({
      params: {
        key: config.apiKey,
        location: { lat: latitude, lng: longitude },
        radius: searchRadius,
        type: placeTypesToSearch[0], // Primary type
        language: config.language,
        region: config.region
      }
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

    // DEBUG: Log the full API response
    logger.debug('Google Places API Response', {
      status: response.status,
      resultCount: response.data.results?.length || 0,
      statusMessage: response.data.status,
      nextPageToken: response.data.next_page_token,
      firstResult: response.data.results?.[0]
    });
    
    const places = response.data.results.map(place => {
      // IMMEDIATE DEBUG - use console.log to see what's happening
      console.log('🔍 RAW GOOGLE PLACE:', {
        place_id: place.place_id,
        name: place.name,
        geometry: place.geometry,
        vicinity: place.vicinity,
        types: place.types?.slice(0, 3) // First 3 types only
      });
      
      const mapped = {
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
        googlePlaceId: mapped.googlePlaceId,
        name: mapped.name,
        latitude: mapped.latitude,
        longitude: mapped.longitude,
        address: mapped.address
      });
      
      return mapped;
    });
    
    // Cache the results
    await cache.set(cacheKey, places, config.cache.nearbySearch);
    
    logger.info('Nearby places search completed', {
      latitude,
      longitude,
      type,
      radius: searchRadius,
      resultCount: places.length
    });
    
    return places;
    
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

// Get detailed information about a specific place
const getPlaceDetails = async (placeId) => {
  try {
    const cacheKey = `details:${placeId}`;
    
    // Check cache first
    const cachedResult = await cache.get(cacheKey);
    if (cachedResult) {
      logger.debug('Returning cached place details', { placeId });
      return cachedResult;
    }
    
    // Fetch place details
    const response = await googleMapsClient.placeDetails({
      params: {
        key: config.apiKey,
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

// Get photo URL from photo reference
const getPhotoUrl = (photoReference, maxWidth = 400, maxHeight = 400) => {
  if (!photoReference) {
    return null;
  }
  
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&maxheight=${maxHeight}&photoreference=${photoReference}&key=${config.apiKey}`;
};

// Search places by text query
const searchPlacesByText = async (query, latitude = null, longitude = null) => {
  try {
    const cacheKey = `textsearch:${query}:${latitude}:${longitude}`;
    
    // Check cache first
    const cachedResult = await cache.get(cacheKey);
    if (cachedResult) {
      logger.debug('Returning cached text search results', { query });
      return cachedResult;
    }
    
    const params = {
      key: config.apiKey,
      query: query,
      language: config.language,
      region: config.region
    };
    
    // Add location bias if coordinates provided
    if (latitude && longitude) {
      params.location = { lat: latitude, lng: longitude };
      params.radius = config.defaultRadius;
    }
    
    const response = await googleMapsClient.textSearch({ params });
    
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
      photos: place.photos ? place.photos.slice(0, 3) : [], // Limit photos
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

// Health check for Google Places API
const healthCheck = async () => {
  try {
    await validateApiKey();
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      apiKey: config.apiKey ? 'configured' : 'missing'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
      apiKey: config.apiKey ? 'configured' : 'missing'
    };
  }
};

module.exports = {
  googleMapsClient,
  config,
  validateApiKey,
  searchNearbyPlaces,
  getPlaceDetails,
  getPhotoUrl,
  searchPlacesByText,
  healthCheck
};