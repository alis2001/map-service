// services/apiService.js - ENHANCED FOR MAXIMUM VENUE COVERAGE + RATE LIMITING RECOVERY
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

// RATE LIMITING RECOVERY SYSTEM
class RateLimitManager {
  constructor() {
    this.isRateLimited = false;
    this.retryAfter = null;
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.consecutiveErrors = 0;
    this.backoffMultiplier = 1;
    this.maxBackoffTime = 30000; // 30 seconds max
    this.recoveryTimeout = null;
  }

  setRateLimited(retryAfter = 5000) {
    console.warn('🚫 Rate limit detected. Implementing smart recovery...');
    this.isRateLimited = true;
    this.retryAfter = Date.now() + retryAfter;
    this.consecutiveErrors++;
    this.backoffMultiplier = Math.min(this.consecutiveErrors * 2, 8);
    
    // Clear any existing recovery timeout
    if (this.recoveryTimeout) {
      clearTimeout(this.recoveryTimeout);
    }
    
    // Auto-recovery mechanism
    this.recoveryTimeout = setTimeout(() => {
      this.recover();
    }, retryAfter * this.backoffMultiplier);
  }

  recover() {
    console.log('✅ Attempting rate limit recovery...');
    this.isRateLimited = false;
    this.retryAfter = null;
    this.consecutiveErrors = Math.max(0, this.consecutiveErrors - 1);
    this.backoffMultiplier = Math.max(1, this.backoffMultiplier * 0.5);
    
    // Process queued requests
    this.processQueue();
  }

  addToQueue(requestConfig, resolve, reject) {
    this.requestQueue.push({ requestConfig, resolve, reject });
    
    // Limit queue size to prevent memory issues
    if (this.requestQueue.length > 20) {
      const { reject: oldReject } = this.requestQueue.shift();
      oldReject(new Error('Request queue overflow'));
    }
  }

  async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;
    
    this.isProcessingQueue = true;
    console.log(`🔄 Processing ${this.requestQueue.length} queued requests...`);
    
    while (this.requestQueue.length > 0 && !this.isRateLimited) {
      const { requestConfig, resolve, reject } = this.requestQueue.shift();
      
      try {
        // Add small delay between requests to avoid immediate re-rate-limiting
        await new Promise(resolve => setTimeout(resolve, 300));
        const response = await api.request(requestConfig);
        resolve(response);
      } catch (error) {
        reject(error);
      }
    }
    
    this.isProcessingQueue = false;
  }

  canMakeRequest() {
    if (!this.isRateLimited) return true;
    if (this.retryAfter && Date.now() > this.retryAfter) {
      this.recover();
      return true;
    }
    return false;
  }

  getWaitTime() {
    if (!this.isRateLimited || !this.retryAfter) return 0;
    return Math.max(0, this.retryAfter - Date.now());
  }
}

// Create rate limit manager instance
const rateLimitManager = new RateLimitManager();

// ENHANCED CACHE for comprehensive results
class EnhancedCache {
  constructor() {
    this.cache = new Map();
    this.maxAge = 10 * 60 * 1000; // 5 minutes cache for comprehensive results
    this.maxSize = 150; // Increased cache size
  }

  generateKey(lat, lng, radius) {
    // Less aggressive rounding for better coverage
    const roundedLat = Math.round(lat * 200) / 200; // ~500m precision
    const roundedLng = Math.round(lng * 200) / 200;
    const roundedRadius = Math.round(radius / 500) * 500;
    return `${roundedLat}-${roundedLng}-${roundedRadius}`;
  }

  extendCacheDuringRateLimit() {
    // During rate limiting, extend cache time to reduce API calls
    this.maxAge = rateLimitManager.isRateLimited ? 20 * 60 * 1000 : 10 * 60 * 1000;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // Extend cache time during rate limiting
    this.extendCacheDuringRateLimit();
    
    if (Date.now() - item.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    const cacheStatus = rateLimitManager.isRateLimited ? ' (RATE LIMIT PROTECTION)' : '';
    console.log('⚡ COMPREHENSIVE CACHE HIT:', key + cacheStatus);
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

// ENHANCED REQUEST INTERCEPTOR with rate limiting
api.interceptors.request.use(
  async (config) => {
    // Check if we can make the request
    if (!rateLimitManager.canMakeRequest()) {
      const waitTime = rateLimitManager.getWaitTime();
      console.warn(`⏳ Rate limited. Queueing request for ${Math.round(waitTime/1000)}s...`);
      
      // Return a promise that resolves when rate limit is lifted
      return new Promise((resolve, reject) => {
        rateLimitManager.addToQueue(config, resolve, reject);
      });
    }

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

// SIMPLE SOLUTION: Just add this to your existing apiService.js response interceptor

// REPLACE your existing response interceptor with this simple version:
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

    // SIMPLE RATE LIMIT HANDLING - AUTO REFRESH
    if (error.response?.status === 429) {
      console.warn('🚫 Rate limit detected - triggering app refresh in 3 seconds...');
      
      // Show the error message briefly, then refresh
      setTimeout(() => {
        console.log('🔄 Refreshing application to recover from rate limit...');
        window.location.reload();
      }, 3000); // 3 second delay to show the loading screen
      
      throw new Error('Ricerca troppo frequente. Ricarico l\'applicazione...');
    }

    // Your existing error handling continues here...
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new Error('Ricerca completa in corso. Attendi...');
    }
    
    if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
      throw new Error('Errore di rete. Controlla la connessione.');
    }
    
    if (error.response?.status === 503) {
      throw new Error('Servizio temporaneamente non disponibile.');
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
  // ⚡ OPTIMIZED Nearby search - parallel requests instead of sequential
  async getAllNearbyPlaces(latitude, longitude, options = {}) {
    try {
      const { radius = 2000, limit = 30 } = options;
      
      // Cache key for combined results with improved precision
      const cacheKey = `combined:${Math.round(latitude * 100) / 100}:${Math.round(longitude * 100) / 100}:${radius}`;
      const cached = enhancedCache.get(cacheKey);
      
      if (cached) {
        console.log('⚡ FRONTEND CACHE HIT - No backend calls needed');
        return cached;
      }

      console.log('🔍 FETCHING BOTH TYPES IN PARALLEL (optimized)...');
      
      // Make PARALLEL calls instead of sequential to reduce total time
      const [cafeResponse, restaurantResponse] = await Promise.all([
        api.get('/api/v1/places/nearby', {
          params: { latitude, longitude, radius, type: 'cafe', limit: Math.floor(limit / 2) },
          timeout: 8000
        }),
        api.get('/api/v1/places/nearby', {
          params: { latitude, longitude, radius, type: 'restaurant', limit: Math.floor(limit / 2) },
          timeout: 8000
        })
      ]);

      const cafePlaces = cafeResponse.data?.data?.places || [];
      const restaurantPlaces = restaurantResponse.data?.data?.places || [];

      const combinedResults = {
        success: true,
        cafePlaces,
        restaurantPlaces,
        allPlaces: [...cafePlaces, ...restaurantPlaces],
        totalPlaces: cafePlaces.length + restaurantPlaces.length,
        userLocation: { latitude, longitude },
        optimized: true
      };

      // Cache combined results with longer TTL
      enhancedCache.set(cacheKey, combinedResults);

      console.log('✅ OPTIMIZED FETCH COMPLETED:', {
        cafes: cafePlaces.length,
        restaurants: restaurantPlaces.length,
        total: combinedResults.totalPlaces,
        backendCalls: 2 // Instead of 10+ with comprehensive search
      });

      return combinedResults;
    } catch (error) {
      console.error('❌ Failed to fetch places (optimized):', error);
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
      comprehensive: true,
      rateLimited: rateLimitManager.isRateLimited,
      queueSize: rateLimitManager.requestQueue.length
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