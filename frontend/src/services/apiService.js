// services/apiService.js - ULTRA-FAST OPTIMIZED VERSION
// Location: /map-service/frontend/src/services/apiService.js

import axios from 'axios';

// Create axios instance with optimized configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001',
  timeout: 8000, // Reduced timeout for faster responses
  headers: {
    'Content-Type': 'application/json',
  },
});

// ULTRA-FAST IN-MEMORY CACHE
class UltraFastCache {
  constructor() {
    this.cache = new Map();
    this.maxAge = 2 * 60 * 1000; // 2 minutes cache
    this.maxSize = 100; // Max 100 cached items
  }

  generateKey(lat, lng, radius) {
    // Round to reduce cache misses for nearby coordinates
    const roundedLat = Math.round(lat * 100) / 100; // ~1km precision
    const roundedLng = Math.round(lng * 100) / 100;
    const roundedRadius = Math.round(radius / 500) * 500; // Round to nearest 500m
    return `${roundedLat}-${roundedLng}-${roundedRadius}`;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    console.log('⚡ CACHE HIT:', key);
    return item.data;
  }

  set(key, data) {
    // Implement simple LRU by removing oldest items
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    console.log('⚡ CACHED:', key, 'Items:', this.cache.size);
  }

  clear() {
    this.cache.clear();
    console.log('⚡ CACHE CLEARED');
  }
}

const ultraFastCache = new UltraFastCache();

// Request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    if (process.env.REACT_APP_DEBUG_MODE === 'true') {
      console.log('⚡ FAST API Request:', {
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
      console.log('⚡ FAST API Response:', {
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
      throw new Error('Connessione lenta. Riprova.');
    }
    
    if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
      throw new Error('Errore di rete. Controlla la connessione.');
    }
    
    if (error.response?.status === 503) {
      throw new Error('Servizio temporaneamente non disponibile.');
    }
    
    if (error.response?.status === 429) {
      throw new Error('Troppe richieste. Attendi un momento.');
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

// ULTRA-FAST Places API
export const placesAPI = {
  // ⚡ Get ALL nearby places (both cafes AND restaurants) in one call
  async getAllNearbyPlaces(latitude, longitude, options = {}) {
    try {
      const radius = options.radius || 1500;
      const limit = options.limit || 50; // Get more results in one call
      
      // Check cache first
      const cacheKey = ultraFastCache.generateKey(latitude, longitude, radius);
      const cached = ultraFastCache.get(cacheKey);
      
      if (cached) {
        console.log('⚡ RETURNING CACHED RESULTS:', cached.totalPlaces);
        return cached;
      }

      console.log('⚡ FETCHING ALL PLACES FROM API...');
      
      // Make parallel requests for cafes AND restaurants
      const [cafeResponse, restaurantResponse] = await Promise.all([
        api.get('/api/v1/places/nearby', {
          params: {
            latitude,
            longitude,
            radius,
            type: 'cafe',
            limit: Math.ceil(limit / 2)
          }
        }),
        api.get('/api/v1/places/nearby', {
          params: {
            latitude,
            longitude,
            radius,
            type: 'restaurant', 
            limit: Math.ceil(limit / 2)
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
        }
      };

      // Cache the combined results
      ultraFastCache.set(cacheKey, combinedResults);
      
      console.log('⚡ ALL PLACES FETCHED:', {
        cafes: cafePlaces.length,
        restaurants: restaurantPlaces.length,
        total: combinedResults.totalPlaces
      });

      return combinedResults;
      
    } catch (error) {
      console.error('❌ Failed to fetch all places:', error);
      throw error;
    }
  },

  // ⚡ DEPRECATED - Use getAllNearbyPlaces instead for better performance  
  async getNearbyPlaces(latitude, longitude, options = {}) {
    // For backward compatibility, use the new method
    const results = await this.getAllNearbyPlaces(latitude, longitude, options);
    
    const requestedType = options.type || 'cafe';
    
    if (requestedType === 'cafe') {
      return {
        success: true,
        places: results.cafePlaces,
        count: results.cafePlaces.length,
        userLocation: results.userLocation
      };
    } else if (requestedType === 'restaurant') {
      return {
        success: true,
        places: results.restaurantPlaces,
        count: results.restaurantPlaces.length,
        userLocation: results.userLocation
      };
    }
    
    // Return all if type not specified
    return {
      success: true,
      places: results.allPlaces,
      count: results.totalPlaces,
      userLocation: results.userLocation
    };
  },

  // Search places by text (optimized)
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

      // Simple cache for text searches
      const textCacheKey = `search:${query}:${params.latitude}:${params.longitude}`;
      const cached = ultraFastCache.get(textCacheKey);
      
      if (cached) {
        return cached;
      }

      console.log('⚡ SEARCHING PLACES:', query);

      const response = await api.get('/api/v1/places/search', { params });
      
      const result = {
        success: true,
        places: response.data.data?.places || [],
        count: response.data.data?.count || 0
      };

      ultraFastCache.set(textCacheKey, result);
      
      return result;
      
    } catch (error) {
      console.error('❌ Failed to search places:', error);
      throw error;
    }
  },

  // Get detailed place information (with cache)
  async getPlaceDetails(placeId, userLocation = null) {
    try {
      const detailsCacheKey = `details:${placeId}`;
      const cached = ultraFastCache.get(detailsCacheKey);
      
      if (cached) {
        return cached;
      }

      const params = {};
      if (userLocation) {
        params.latitude = userLocation.latitude;
        params.longitude = userLocation.longitude;
      }

      const response = await api.get(`/api/v1/places/${placeId}`, { params });
      
      const result = {
        success: true,
        place: response.data.data
      };

      ultraFastCache.set(detailsCacheKey, result);
      
      return result;
      
    } catch (error) {
      console.error('❌ Failed to fetch place details:', error);
      throw error;
    }
  },

  // Clear cache manually
  clearCache() {
    ultraFastCache.clear();
  },

  // Get cache stats
  getCacheStats() {
    return {
      size: ultraFastCache.cache.size,
      maxSize: ultraFastCache.maxSize,
      maxAge: ultraFastCache.maxAge
    };
  }
};

// Enhanced Health check with fast timeout
export const healthAPI = {
  async checkHealth() {
    try {
      console.log('⚡ Fast health check...');
      const startTime = Date.now();
      
      const response = await api.get('/health', {
        timeout: 5000 // Faster timeout for health checks
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
        ready: isHealthy
      };
    } catch (error) {
      console.error('⚡ Fast health check failed:', error);
      
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        responseTime: null,
        status: 'unhealthy',
        ready: false
      };
    }
  },

  async quickPing() {
    try {
      const startTime = Date.now();
      const response = await api.get('/', { timeout: 3000 });
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

// Ultra-fast utility functions
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