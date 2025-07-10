// services/apiService.js - ENHANCED FOR MAXIMUM VENUE COVERAGE
// Location: /frontend/src/services/apiService.js

import axios from 'axios';

// Create axios instance with optimized configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001',
  timeout: 15000, // INCREASED timeout for comprehensive searches
  headers: {
    'Content-Type': 'application/json',
  },
});

// ENHANCED CACHE for comprehensive results
class EnhancedCache {
  constructor() {
    this.cache = new Map();
    this.maxAge = 5 * 60 * 1000; // 5 minutes cache for comprehensive results
    this.maxSize = 150; // Increased cache size
  }

  generateKey(lat, lng, radius) {
    // Less aggressive rounding for better coverage
    const roundedLat = Math.round(lat * 200) / 200; // ~500m precision
    const roundedLng = Math.round(lng * 200) / 200;
    const roundedRadius = Math.round(radius / 500) * 500;
    return `${roundedLat}-${roundedLng}-${roundedRadius}`;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    console.log('⚡ COMPREHENSIVE CACHE HIT:', key);
    return item.data;
  }

  set(key, data) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    console.log('⚡ COMPREHENSIVE CACHED:', key, 'Items:', this.cache.size);
  }

  clear() {
    this.cache.clear();
    console.log('⚡ COMPREHENSIVE CACHE CLEARED');
  }
}

const enhancedCache = new EnhancedCache();

// Request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    if (process.env.REACT_APP_DEBUG_MODE === 'true') {
      console.log('⚡ COMPREHENSIVE API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        params: config.params
      });
    }
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with enhanced error handling
api.interceptors.response.use(
  (response) => {
    if (process.env.REACT_APP_DEBUG_MODE === 'true') {
      console.log('⚡ COMPREHENSIVE API Response:', {
        status: response.status,
        url: response.config.url,
        dataCount: response.data.data?.places?.length || 0
      });
    }
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url
    });

    // Handle specific error cases with Italian messages
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new Error('Ricerca completa in corso. Attendi...');
    }
    
    if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
      throw new Error('Errore di rete. Controlla la connessione.');
    }
    
    if (error.response?.status === 503) {
      throw new Error('Servizio temporaneamente non disponibile.');
    }
    
    if (error.response?.status === 429) {
      throw new Error('Ricerca troppo frequente. Attendi un momento.');
    }
    
    if (error.response?.status >= 500) {
      throw new Error('Errore del server. Riprova più tardi.');
    }
    
    if (!error.response) {
      throw new Error('Impossibile connettersi al servizio.');
    }

    return Promise.reject(error);
  }
);

// ENHANCED Places API for Maximum Coverage
export const placesAPI = {
  // ⚡ Get ALL nearby places with COMPREHENSIVE search
  async getAllNearbyPlaces(latitude, longitude, options = {}) {
    try {
      const radius = options.radius || 3000; // INCREASED default to 3km
      const limit = options.limit || 80;     // INCREASED to 80 results total
      
      // Check cache first
      const cacheKey = enhancedCache.generateKey(latitude, longitude, radius);
      const cached = enhancedCache.get(cacheKey);
      
      if (cached) {
        console.log('⚡ RETURNING COMPREHENSIVE CACHED RESULTS:', cached.totalPlaces);
        return cached;
      }

      console.log('⚡ FETCHING ALL PLACES WITH COMPREHENSIVE SEARCH...');
      
      // Make parallel requests for cafes AND restaurants with higher limits
      const [cafeResponse, restaurantResponse] = await Promise.all([
        api.get('/api/v1/places/nearby', {
          params: {
            latitude,
            longitude,
            radius,
            type: 'cafe',
            limit: 40 // Higher limit per type for comprehensive coverage
          }
        }),
        api.get('/api/v1/places/nearby', {
          params: {
            latitude,
            longitude,
            radius,
            type: 'restaurant', 
            limit: 40 // Higher limit per type for comprehensive coverage
          }
        })
      ]);

      // Combine results
      const cafePlaces = cafeResponse.data.data?.places || [];
      const restaurantPlaces = restaurantResponse.data.data?.places || [];
      
      const combinedResults = {
        success: true,
        allPlaces: [...cafePlaces, ...restaurantPlaces],
        cafePlaces: cafePlaces,
        restaurantPlaces: restaurantPlaces,
        totalPlaces: cafePlaces.length + restaurantPlaces.length,
        userLocation: {
          latitude,
          longitude
        },
        searchMetadata: {
          radius,
          comprehensive: true,
          strategies: 5,
          timestamp: new Date().toISOString()
        }
      };

      // Cache the combined results
      enhancedCache.set(cacheKey, combinedResults);
      
      console.log('⚡ COMPREHENSIVE PLACES FETCHED:', {
        cafes: cafePlaces.length,
        restaurants: restaurantPlaces.length,
        total: combinedResults.totalPlaces,
        radius: radius + 'm'
      });

      return combinedResults;
      
    } catch (error) {
      console.error('❌ Failed to fetch comprehensive places:', error);
      throw error;
    }
  },

  // ⚡ ENHANCED Nearby search with comprehensive coverage
  async getNearbyPlaces(latitude, longitude, options = {}) {
    // Use comprehensive search for better coverage
    const results = await this.getAllNearbyPlaces(latitude, longitude, options);
    
    const requestedType = options.type || 'cafe';
    
    if (requestedType === 'cafe') {
      return {
        success: true,
        places: results.cafePlaces,
        count: results.cafePlaces.length,
        userLocation: results.userLocation,
        comprehensive: true
      };
    } else if (requestedType === 'restaurant') {
      return {
        success: true,
        places: results.restaurantPlaces,
        count: results.restaurantPlaces.length,
        userLocation: results.userLocation,
        comprehensive: true
      };
    }
    
    // Return all if type not specified
    return {
      success: true,
      places: results.allPlaces,
      count: results.totalPlaces,
      userLocation: results.userLocation,
      comprehensive: true
    };
  },

  // Enhanced search with longer timeout
  async searchPlaces(query, options = {}) {
    try {
      const params = {
        query,
        latitude: options.latitude,
        longitude: options.longitude,
        limit: options.limit || 30 // Increased limit for search
      };

      // Remove undefined values
      Object.keys(params).forEach(key => 
        params[key] === undefined && delete params[key]
      );

      // Enhanced cache for text searches
      const textCacheKey = `search:${query}:${params.latitude}:${params.longitude}`;
      const cached = enhancedCache.get(textCacheKey);
      
      if (cached) {
        return cached;
      }

      console.log('⚡ COMPREHENSIVE SEARCH:', query);

      const response = await api.get('/api/v1/places/search', { 
        params,
        timeout: 12000 // Increased timeout for comprehensive search
      });
      
      const result = {
        success: true,
        places: response.data.data?.places || [],
        count: response.data.data?.count || 0,
        comprehensive: true
      };

      enhancedCache.set(textCacheKey, result);
      
      return result;
      
    } catch (error) {
      console.error('❌ Failed to search places comprehensively:', error);
      throw error;
    }
  },

  // Get detailed place information (with enhanced cache)
  async getPlaceDetails(placeId, userLocation = null) {
    try {
      const detailsCacheKey = `details:${placeId}`;
      const cached = enhancedCache.get(detailsCacheKey);
      
      if (cached) {
        return cached;
      }

      const params = {};
      if (userLocation) {
        params.latitude = userLocation.latitude;
        params.longitude = userLocation.longitude;
      }

      const response = await api.get(`/api/v1/places/${placeId}`, { 
        params,
        timeout: 10000 // Enhanced timeout
      });
      
      const result = {
        success: true,
        place: response.data.data
      };

      enhancedCache.set(detailsCacheKey, result);
      
      return result;
      
    } catch (error) {
      console.error('❌ Failed to fetch place details:', error);
      throw error;
    }
  },

  // Clear comprehensive cache
  clearCache() {
    enhancedCache.clear();
  },

  // Get enhanced cache stats
  getCacheStats() {
    return {
      size: enhancedCache.cache.size,
      maxSize: enhancedCache.maxSize,
      maxAge: enhancedCache.maxAge,
      comprehensive: true
    };
  }
};

// Enhanced Health check with comprehensive search awareness
export const healthAPI = {
  async checkHealth() {
    try {
      console.log('⚡ Comprehensive health check...');
      const startTime = Date.now();
      
      const response = await api.get('/health', {
        timeout: 8000 // Increased timeout
      });
      
      const duration = Date.now() - startTime;
      const healthData = response.data;
      
      const isHealthy = response.status === 200 && 
                       (healthData.status === 'OK' || 
                        healthData.status === 'healthy' || 
                        healthData.status === 'DEGRADED');
      
      return {
        success: isHealthy,
        status: healthData.status || 'unknown',
        services: healthData.services || {},
        timestamp: healthData.timestamp || new Date().toISOString(),
        responseTime: duration,
        ready: isHealthy,
        comprehensiveSearch: healthData.comprehensiveSearch || false
      };
    } catch (error) {
      console.error('⚡ Comprehensive health check failed:', error);
      
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        responseTime: null,
        status: 'unhealthy',
        ready: false,
        comprehensiveSearch: false
      };
    }
  },

  async quickPing() {
    try {
      const startTime = Date.now();
      const response = await api.get('/', { timeout: 5000 });
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
  }
};

// Enhanced utility functions
export const apiUtils = {
  // Format place data optimized
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

  // Fast distance calculation (Haversine)
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  },

  // Fast distance formatting
  formatDistance(distanceInMeters) {
    if (!distanceInMeters || distanceInMeters < 0) return null;
    
    if (distanceInMeters < 1000) {
      return `${Math.round(distanceInMeters)}m`;
    } else {
      const km = (distanceInMeters / 1000).toFixed(1);
      return `${km}km`;
    }
  },

  // Get venue type emoji (optimized)
  getTypeEmoji(type) {
    switch (type) {
      case 'restaurant': return '🍽️';
      case 'cafe': return '☕';
      default: return '📍';
    }
  },

  // Validate venue type (strict filtering)
  isValidVenueType(type) {
    return ['cafe', 'restaurant'].includes(type);
  },

  // Get Italian venue display name
  getItalianVenueDisplayName(type) {
    switch (type) {
      case 'cafe': return 'Bar/Caffetteria';
      case 'restaurant': return 'Ristorante';
      default: return 'Locale';
    }
  }
};

export default api;