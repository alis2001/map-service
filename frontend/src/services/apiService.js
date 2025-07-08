// services/apiService.js
// Location: /map-service/frontend/src/services/apiService.js

import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001',
  timeout: 10000,
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
        data: config.data
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
        url: response.config.url
      });
    }
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
    });

    // Handle specific error cases
    if (error.response?.status === 503) {
      throw new Error('Il servizio mappa non è disponibile. Riprova più tardi.');
    }
    
    if (error.response?.status === 429) {
      throw new Error('Troppe richieste. Riprova tra qualche secondo.');
    }
    
    if (error.response?.status >= 500) {
      throw new Error('Errore del server. Riprova più tardi.');
    }
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Richiesta scaduta. Controlla la connessione internet.');
    }
    
    if (!error.response) {
      throw new Error('Impossibile connettersi al servizio mappa.');
    }

    return Promise.reject(error);
  }
);

// Places API functions
export const placesAPI = {
  // Get nearby cafes/bars
  async getNearbyPlaces(latitude, longitude, options = {}) {
    try {
      const params = {
        latitude,
        longitude,
        radius: options.radius || 1500,
        type: options.type || 'cafe',
        limit: options.limit || 20
      };

      const response = await api.get('/api/v1/places/nearby', { params });
      
      return {
        success: true,
        places: response.data.data?.places || [],
        count: response.data.data?.count || 0,
        userLocation: response.data.data?.userLocation
      };
    } catch (error) {
      console.error('Failed to fetch nearby places:', error);
      throw error;
    }
  },

  // Search places by text
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
      console.error('Failed to search places:', error);
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

  // Get popular places by type
  async getPopularPlaces(type = 'cafe', options = {}) {
    try {
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

      const response = await api.get(`/api/v1/places/popular/${type}`, { params });
      
      return {
        success: true,
        places: response.data.data?.places || [],
        count: response.data.data?.count || 0
      };
    } catch (error) {
      console.error('Failed to fetch popular places:', error);
      throw error;
    }
  },

  // Batch search multiple locations
  async batchSearch(locations) {
    try {
      const response = await api.post('/api/v1/places/batch-search', {
        locations
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
      const params = {
        northLat: bounds.north,
        southLat: bounds.south,
        eastLng: bounds.east,
        westLng: bounds.west,
        type: options.type || 'cafe',
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

// Health check function
export const healthAPI = {
  async checkHealth() {
    try {
      const response = await api.get('/health');
      
      return {
        success: true,
        status: response.data.status,
        services: response.data.services || {},
        timestamp: response.data.timestamp,
        uptime: response.data.uptime
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  },

  async checkPlacesService() {
    try {
      const response = await api.get('/api/v1/places/health');
      
      return {
        success: true,
        status: response.data.status,
        services: response.data.services || {},
        timestamp: response.data.timestamp
      };
    } catch (error) {
      console.error('Places service health check failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
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

  // Get place type emoji
  getTypeEmoji(type) {
    const typeEmojis = {
      cafe: '☕',
      bar: '🍺',
      restaurant: '🍽️',
      bakery: '🥐',
      default: '📍'
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
  }
};

export default api;