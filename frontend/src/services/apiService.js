// services/apiService.js - UPDATED VERSION with Enhanced Health Checking
// Location: /map-service/frontend/src/services/apiService.js

import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001',
  timeout: 15000, // Increased timeout for health checks
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    if (process.env.REACT_APP_DEBUG_MODE === 'true') {
      console.log('🚀 API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        params: config.params,
        data: config.data,
        timeout: config.timeout
      });
    }
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    if (process.env.REACT_APP_DEBUG_MODE === 'true') {
      console.log('✅ API Response:', {
        status: response.status,
        data: response.data,
        url: response.config.url,
        duration: response.config.metadata?.endTime - response.config.metadata?.startTime
      });
    }
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      timeout: error.code === 'ECONNABORTED'
    });

    // Handle specific error cases with Italian messages
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new Error('Timeout di connessione. Il servizio potrebbe essere sovraccarico.');
    }
    
    if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
      throw new Error('Errore di rete. Controlla la connessione internet.');
    }
    
    if (error.response?.status === 503) {
      throw new Error('Il servizio mappa non è disponibile. Riprova più tardi.');
    }
    
    if (error.response?.status === 429) {
      throw new Error('Troppe richieste. Riprova tra qualche secondo.');
    }
    
    if (error.response?.status >= 500) {
      throw new Error('Errore del server. Riprova più tardi.');
    }
    
    if (!error.response) {
      throw new Error('Impossibile connettersi al servizio mappa.');
    }

    return Promise.reject(error);
  }
);

// Add request timing
api.interceptors.request.use((config) => {
  config.metadata = { startTime: new Date().getTime() };
  return config;
});

api.interceptors.response.use(
  (response) => {
    response.config.metadata.endTime = new Date().getTime();
    return response;
  },
  (error) => {
    if (error.config) {
      error.config.metadata = error.config.metadata || {};
      error.config.metadata.endTime = new Date().getTime();
    }
    return Promise.reject(error);
  }
);

// Places API functions
export const placesAPI = {
  // Get nearby Italian venues (cafes/restaurants only)
  async getNearbyPlaces(latitude, longitude, options = {}) {
    try {
      const params = {
        latitude,
        longitude,
        radius: options.radius || 1500,
        type: options.type || 'cafe', // Only 'cafe' or 'restaurant' allowed
        limit: options.limit || 20
      };

      // Validate type to ensure no pub requests
      if (!['cafe', 'restaurant'].includes(params.type)) {
        console.warn(`Invalid place type "${params.type}", defaulting to cafe`);
        params.type = 'cafe';
      }

      const response = await api.get('/api/v1/places/nearby', { params });
      
      return {
        success: true,
        places: response.data.data?.places || [],
        count: response.data.data?.count || 0,
        userLocation: response.data.data?.userLocation
      };
    } catch (error) {
      console.error('Failed to fetch nearby Italian venues:', error);
      throw error;
    }
  },

  // Search Italian venues by text
  async searchPlaces(query, options = {}) {
    try {
      const params = {
        query,
        latitude: options.latitude,
        longitude: options.longitude,
        limit: options.limit || 20
      };

      // Remove undefined values
      Object.keys(params).forEach(key => 
        params[key] === undefined && delete params[key]
      );

      const response = await api.get('/api/v1/places/search', { params });
      
      return {
        success: true,
        places: response.data.data?.places || [],
        count: response.data.data?.count || 0
      };
    } catch (error) {
      console.error('Failed to search Italian venues:', error);
      throw error;
    }
  },

  // Get detailed place information
  async getPlaceDetails(placeId, userLocation = null) {
    try {
      const params = {};
      if (userLocation) {
        params.latitude = userLocation.latitude;
        params.longitude = userLocation.longitude;
      }

      const response = await api.get(`/api/v1/places/${placeId}`, { params });
      
      return {
        success: true,
        place: response.data.data
      };
    } catch (error) {
      console.error('Failed to fetch place details:', error);
      throw error;
    }
  },

  // Get popular Italian venues by type (no pub support)
  async getPopularPlaces(type = 'cafe', options = {}) {
    try {
      // Validate type to ensure no pub requests
      const validType = ['cafe', 'restaurant'].includes(type) ? type : 'cafe';
      
      const params = {
        limit: options.limit || 10,
        minRating: options.minRating || 4.0,
        latitude: options.latitude,
        longitude: options.longitude
      };

      // Remove undefined values
      Object.keys(params).forEach(key => 
        params[key] === undefined && delete params[key]
      );

      const response = await api.get(`/api/v1/places/popular/${validType}`, { params });
      
      return {
        success: true,
        places: response.data.data?.places || [],
        count: response.data.data?.count || 0
      };
    } catch (error) {
      console.error('Failed to fetch popular Italian venues:', error);
      throw error;
    }
  },

  // Batch search multiple locations
  async batchSearch(locations) {
    try {
      // Validate all location types
      const validatedLocations = locations.map(location => ({
        ...location,
        type: ['cafe', 'restaurant'].includes(location.type) ? location.type : 'cafe'
      }));

      const response = await api.post('/api/v1/places/batch-search', {
        locations: validatedLocations
      });
      
      return {
        success: true,
        results: response.data.data?.results || [],
        summary: response.data.data?.summary
      };
    } catch (error) {
      console.error('Failed to perform batch search:', error);
      throw error;
    }
  },

  // Get places within geographic bounds
  async getPlacesWithinBounds(bounds, options = {}) {
    try {
      // Validate type
      const validType = ['cafe', 'restaurant'].includes(options.type) ? options.type : 'cafe';
      
      const params = {
        northLat: bounds.north,
        southLat: bounds.south,
        eastLng: bounds.east,
        westLng: bounds.west,
        type: validType,
        limit: options.limit || 50
      };

      const response = await api.get('/api/v1/places/within-bounds', { params });
      
      return {
        success: true,
        places: response.data.data?.places || [],
        count: response.data.data?.count || 0,
        bounds: response.data.data?.bounds
      };
    } catch (error) {
      console.error('Failed to fetch places within bounds:', error);
      throw error;
    }
  },

  // Get place photos
  async getPlacePhotos(placeId, size = 'medium') {
    try {
      const response = await api.get(`/api/v1/places/photos/${placeId}`, {
        params: { size }
      });
      
      return {
        success: true,
        photos: response.data.data?.photos || [],
        count: response.data.data?.count || 0,
        availableSizes: response.data.data?.availableSizes || []
      };
    } catch (error) {
      console.error('Failed to fetch place photos:', error);
      throw error;
    }
  }
};

// Enhanced Health check functions
export const healthAPI = {
  // Main health check with comprehensive testing
  async checkHealth() {
    try {
      console.log('🏥 Starting comprehensive health check...');
      const startTime = Date.now();
      
      // Test basic connectivity first
      const response = await api.get('/health', {
        timeout: 10000, // 10 second timeout for health check
        validateStatus: (status) => status < 500 // Accept any status below 500
      });
      
      const duration = Date.now() - startTime;
      console.log(`🏥 Health check completed in ${duration}ms`);
      
      const healthData = response.data;
      
      // Determine if the service is actually healthy
      const isHealthy = response.status === 200 && 
                       (healthData.status === 'OK' || 
                        healthData.status === 'healthy' || 
                        healthData.status === 'DEGRADED'); // Accept degraded as working
      
      return {
        success: isHealthy,
        status: healthData.status || 'unknown',
        services: healthData.services || {},
        timestamp: healthData.timestamp || new Date().toISOString(),
        uptime: healthData.uptime || 0,
        version: healthData.version || 'unknown',
        responseTime: duration,
        rawResponse: healthData
      };
    } catch (error) {
      console.error('🏥 Health check failed:', error);
      
      // Distinguish between different types of failures
      let errorType = 'unknown';
      let errorMessage = error.message;
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorType = 'timeout';
        errorMessage = 'Health check timeout - service may be starting up';
      } else if (error.code === 'ECONNREFUSED') {
        errorType = 'connection_refused';
        errorMessage = 'Connection refused - service may be down';
      } else if (error.code === 'NETWORK_ERROR') {
        errorType = 'network_error';
        errorMessage = 'Network error - check internet connection';
      } else if (error.response?.status >= 500) {
        errorType = 'server_error';
        errorMessage = `Server error: ${error.response.status}`;
      }
      
      return {
        success: false,
        error: errorMessage,
        errorType: errorType,
        timestamp: new Date().toISOString(),
        responseTime: null,
        status: 'unhealthy'
      };
    }
  },

  // Places service specific health check
  async checkPlacesService() {
    try {
      console.log('🏥 Checking places service health...');
      const response = await api.get('/api/v1/places/health', {
        timeout: 8000
      });
      
      return {
        success: true,
        status: response.data.status || 'healthy',
        services: response.data.services || {},
        timestamp: response.data.timestamp || new Date().toISOString()
      };
    } catch (error) {
      console.error('🏥 Places service health check failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  },

  // Quick ping test
  async quickPing() {
    try {
      const startTime = Date.now();
      const response = await api.get('/', {
        timeout: 5000
      });
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        responseTime: duration,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        responseTime: null
      };
    }
  },

  // Wait for service to be ready
  async waitForReady(maxAttempts = 10, delayMs = 2000) {
    console.log(`🏥 Waiting for service to be ready (max ${maxAttempts} attempts)...`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🏥 Health check attempt ${attempt}/${maxAttempts}`);
        const health = await this.checkHealth();
        
        if (health.success) {
          console.log(`✅ Service is ready after ${attempt} attempts`);
          return health;
        }
        
        if (attempt < maxAttempts) {
          console.log(`⏳ Service not ready, waiting ${delayMs}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          delayMs = Math.min(delayMs * 1.2, 8000); // Progressive delay with max 8s
        }
      } catch (error) {
        console.error(`❌ Health check attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    
    throw new Error(`Service failed to become ready after ${maxAttempts} attempts`);
  }
};

// Utility functions
export const apiUtils = {
  // Format place data for display
  formatPlace(place) {
    return {
      id: place.id,
      googlePlaceId: place.googlePlaceId,
      name: place.name,
      address: place.address,
      location: {
        latitude: place.location?.latitude || place.latitude,
        longitude: place.location?.longitude || place.longitude
      },
      type: place.placeType || place.type,
      rating: place.rating,
      priceLevel: place.priceLevel,
      distance: place.distance,
      photos: place.photos || [],
      photoUrls: place.photoUrls || {},
      openingHours: place.openingHours,
      phoneNumber: place.phoneNumber,
      website: place.website,
      businessStatus: place.businessStatus
    };
  },

  // Calculate distance between two points (Haversine formula)
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  },

  // Format distance for display
  formatDistance(distanceInMeters) {
    if (!distanceInMeters || distanceInMeters < 0) return null;
    
    if (distanceInMeters < 1000) {
      return `${Math.round(distanceInMeters)}m`;
    } else {
      const km = (distanceInMeters / 1000).toFixed(1);
      return `${km}km`;
    }
  },

  // Get Italian venue type emoji (no pub support)
  getTypeEmoji(type) {
    const typeEmojis = {
      cafe: '☕',        // Italian cafeterias/bars
      restaurant: '🍽️', // Restaurants
      bakery: '🥐',     // Bakeries
      default: '📍'     // Default
    };
    
    return typeEmojis[type] || typeEmojis.default;
  },

  // Get rating stars
  getRatingStars(rating) {
    if (!rating) return '';
    
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return '★'.repeat(fullStars) + 
           (hasHalfStar ? '☆' : '') + 
           '☆'.repeat(emptyStars);
  },

  // Get Italian venue display name (no pub support)
  getItalianVenueDisplayName(type) {
    switch (type) {
      case 'cafe': return 'Bar/Caffetteria';
      case 'restaurant': return 'Ristorante';
      default: return 'Locale';
    }
  },

  // Validate Italian venue type (no pub support)
  isValidItalianVenueType(type) {
    return ['cafe', 'restaurant'].includes(type);
  },

  // Get Italian venue features
  getItalianVenueFeatures(place) {
    const features = [];
    const nameLower = (place.name || '').toLowerCase();
    
    if (nameLower.includes('wifi') || nameLower.includes('internet')) {
      features.push('📶 WiFi');
    }
    if (nameLower.includes('terrazza') || nameLower.includes('giardino')) {
      features.push('🌿 Esterno');
    }
    if (nameLower.includes('colazione') || nameLower.includes('breakfast')) {
      features.push('🌅 Colazione');
    }
    if (nameLower.includes('aperitivo')) {
      features.push('🍸 Aperitivo');
    }
    if (nameLower.includes('pizza')) {
      features.push('🍕 Pizza');
    }
    if (nameLower.includes('gelato') || nameLower.includes('gelateria')) {
      features.push('🍦 Gelato');
    }
    if (nameLower.includes('musica') || nameLower.includes('live')) {
      features.push('🎵 Musica');
    }
    
    return features;
  },

  // Format opening hours for Italian context
  formatItalianOpeningHours(openingHours) {
    if (!openingHours || !openingHours.weekdayText) {
      return null;
    }

    return openingHours.weekdayText.map(text => {
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
};

export default api;