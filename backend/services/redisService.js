// services/redisService.js
// Location: /backend/services/redisService.js

const { cache } = require('../config/redis');
const logger = require('../utils/logger');
const { generateCacheKey, generateLocationCacheKey, generateUserCacheKey } = require('../utils/helpers');

// Cache TTL configurations (in seconds)
const CACHE_TTL = {
  user: 900,           // 15 minutes
  userLocation: 300,   // 5 minutes
  places: 1800,        // 30 minutes
  placeDetails: 3600,  // 1 hour
  nearbySearch: 300,   // 5 minutes
  textSearch: 600,     // 10 minutes
  authAttempts: 900,   // 15 minutes
  rateLimit: 3600,     // 1 hour
  session: 86400,      // 24 hours
  statistics: 300      // 5 minutes
};

// Cache key prefixes
const CACHE_PREFIXES = {
  user: 'user',
  userLocation: 'user_location',
  place: 'place',
  placeDetails: 'place_details',
  nearbySearch: 'nearby',
  textSearch: 'text_search',
  authAttempts: 'auth_attempts',
  rateLimit: 'rate_limit',
  session: 'session',
  stats: 'stats'
};

class RedisService {
  // User caching
  async cacheUser(userId, userData) {
    try {
      const key = generateUserCacheKey(userId);
      const success = await cache.set(key, userData, CACHE_TTL.user);
      
      if (success) {
        logger.debug('User cached successfully', { userId });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to cache user', { userId, error: error.message });
      return false;
    }
  }

  async getUser(userId) {
    try {
      const key = generateUserCacheKey(userId);
      const userData = await cache.get(key);
      
      if (userData) {
        logger.debug('User cache hit', { userId });
      } else {
        logger.debug('User cache miss', { userId });
      }
      
      return userData;
    } catch (error) {
      logger.error('Failed to get user from cache', { userId, error: error.message });
      return null;
    }
  }

  async invalidateUser(userId) {
    try {
      const key = generateUserCacheKey(userId);
      const success = await cache.del(key);
      
      if (success) {
        logger.debug('User cache invalidated', { userId });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to invalidate user cache', { userId, error: error.message });
      return false;
    }
  }

  // Location caching
  async cacheUserLocation(userId, locationData) {
    try {
      const key = generateCacheKey(CACHE_PREFIXES.userLocation, userId);
      const success = await cache.set(key, locationData, CACHE_TTL.userLocation);
      
      if (success) {
        logger.debug('User location cached', { userId });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to cache user location', { userId, error: error.message });
      return false;
    }
  }

  async getUserLocation(userId) {
    try {
      const key = generateCacheKey(CACHE_PREFIXES.userLocation, userId);
      return await cache.get(key);
    } catch (error) {
      logger.error('Failed to get user location from cache', { userId, error: error.message });
      return null;
    }
  }

  // Places caching
  async cacheNearbyPlaces(latitude, longitude, radius, type, places) {
    try {
      const key = generateLocationCacheKey(latitude, longitude, radius, type);
      const success = await cache.set(key, places, CACHE_TTL.nearbySearch);
      
      if (success) {
        logger.debug('Nearby places cached', { 
          latitude, 
          longitude, 
          radius, 
          type, 
          count: places.length 
        });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to cache nearby places', { 
        latitude, 
        longitude, 
        error: error.message 
      });
      return false;
    }
  }

  async getNearbyPlaces(latitude, longitude, radius, type) {
    try {
      const key = generateLocationCacheKey(latitude, longitude, radius, type);
      const places = await cache.get(key);
      
      if (places) {
        logger.debug('Nearby places cache hit', { 
          latitude, 
          longitude, 
          radius, 
          type,
          count: places.length 
        });
      }
      
      return places;
    } catch (error) {
      logger.error('Failed to get nearby places from cache', { 
        latitude, 
        longitude, 
        error: error.message 
      });
      return null;
    }
  }

  async cachePlaceDetails(placeId, placeData) {
    try {
      const key = generateCacheKey(CACHE_PREFIXES.placeDetails, placeId);
      const success = await cache.set(key, placeData, CACHE_TTL.placeDetails);
      
      if (success) {
        logger.debug('Place details cached', { placeId });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to cache place details', { placeId, error: error.message });
      return false;
    }
  }

  async getPlaceDetails(placeId) {
    try {
      const key = generateCacheKey(CACHE_PREFIXES.placeDetails, placeId);
      return await cache.get(key);
    } catch (error) {
      logger.error('Failed to get place details from cache', { placeId, error: error.message });
      return null;
    }
  }

  // Text search caching
  async cacheTextSearch(query, latitude, longitude, results) {
    try {
      const key = generateCacheKey(CACHE_PREFIXES.textSearch, query, latitude, longitude);
      const success = await cache.set(key, results, CACHE_TTL.textSearch);
      
      if (success) {
        logger.debug('Text search results cached', { query, count: results.length });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to cache text search results', { query, error: error.message });
      return false;
    }
  }

  async getTextSearch(query, latitude, longitude) {
    try {
      const key = generateCacheKey(CACHE_PREFIXES.textSearch, query, latitude, longitude);
      return await cache.get(key);
    } catch (error) {
      logger.error('Failed to get text search from cache', { query, error: error.message });
      return null;
    }
  }

  // Authentication rate limiting
  async incrementAuthAttempts(identifier) {
    try {
      const key = generateCacheKey(CACHE_PREFIXES.authAttempts, identifier);
      const current = await cache.get(key) || 0;
      const newCount = current + 1;
      
      await cache.set(key, newCount, CACHE_TTL.authAttempts);
      
      logger.debug('Auth attempts incremented', { identifier, count: newCount });
      return newCount;
    } catch (error) {
      logger.error('Failed to increment auth attempts', { identifier, error: error.message });
      return 0;
    }
  }

  async getAuthAttempts(identifier) {
    try {
      const key = generateCacheKey(CACHE_PREFIXES.authAttempts, identifier);
      return await cache.get(key) || 0;
    } catch (error) {
      logger.error('Failed to get auth attempts', { identifier, error: error.message });
      return 0;
    }
  }

  async clearAuthAttempts(identifier) {
    try {
      const key = generateCacheKey(CACHE_PREFIXES.authAttempts, identifier);
      const success = await cache.del(key);
      
      if (success) {
        logger.debug('Auth attempts cleared', { identifier });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to clear auth attempts', { identifier, error: error.message });
      return false;
    }
  }

  // Rate limiting
  async checkRateLimit(identifier, action, limit, windowMs) {
    try {
      const key = generateCacheKey(CACHE_PREFIXES.rateLimit, action, identifier);
      const current = await cache.get(key) || 0;
      
      if (current >= limit) {
        const ttl = await cache.ttl(key);
        return {
          allowed: false,
          count: current,
          limit,
          resetTime: Date.now() + (ttl * 1000)
        };
      }
      
      // Increment counter
      const newCount = current + 1;
      const ttl = current === 0 ? Math.floor(windowMs / 1000) : null;
      
      if (ttl) {
        await cache.set(key, newCount, ttl);
      } else {
        await cache.set(key, newCount);
      }
      
      return {
        allowed: true,
        count: newCount,
        limit,
        resetTime: null
      };
    } catch (error) {
      logger.error('Rate limit check failed', { identifier, action, error: error.message });
      // Allow request if cache fails
      return { allowed: true, count: 0, limit, resetTime: null };
    }
  }

  // Session management
  async cacheSession(sessionId, sessionData) {
    try {
      const key = generateCacheKey(CACHE_PREFIXES.session, sessionId);
      const success = await cache.set(key, sessionData, CACHE_TTL.session);
      
      if (success) {
        logger.debug('Session cached', { sessionId });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to cache session', { sessionId, error: error.message });
      return false;
    }
  }

  async getSession(sessionId) {
    try {
      const key = generateCacheKey(CACHE_PREFIXES.session, sessionId);
      return await cache.get(key);
    } catch (error) {
      logger.error('Failed to get session from cache', { sessionId, error: error.message });
      return null;
    }
  }

  async invalidateSession(sessionId) {
    try {
      const key = generateCacheKey(CACHE_PREFIXES.session, sessionId);
      const success = await cache.del(key);
      
      if (success) {
        logger.debug('Session invalidated', { sessionId });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to invalidate session', { sessionId, error: error.message });
      return false;
    }
  }

  // Statistics caching
  async cacheStatistics(statType, data) {
    try {
      const key = generateCacheKey(CACHE_PREFIXES.stats, statType);
      const success = await cache.set(key, data, CACHE_TTL.statistics);
      
      if (success) {
        logger.debug('Statistics cached', { statType });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to cache statistics', { statType, error: error.message });
      return false;
    }
  }

  async getStatistics(statType) {
    try {
      const key = generateCacheKey(CACHE_PREFIXES.stats, statType);
      return await cache.get(key);
    } catch (error) {
      logger.error('Failed to get statistics from cache', { statType, error: error.message });
      return null;
    }
  }

  // Cache invalidation patterns
  async invalidateUserData(userId) {
    try {
      const patterns = [
        generateUserCacheKey(userId),
        generateCacheKey(CACHE_PREFIXES.userLocation, userId),
        generateCacheKey(CACHE_PREFIXES.session, `*${userId}*`)
      ];
      
      const results = await Promise.all(
        patterns.map(pattern => cache.del(pattern))
      );
      
      logger.debug('User data invalidated', { userId, patterns: patterns.length });
      return results.every(result => result);
    } catch (error) {
      logger.error('Failed to invalidate user data', { userId, error: error.message });
      return false;
    }
  }

  async invalidatePlaceData(placeId) {
    try {
      const key = generateCacheKey(CACHE_PREFIXES.placeDetails, placeId);
      const success = await cache.del(key);
      
      // Also clear related nearby searches (would need pattern matching for full implementation)
      // This is a simplified version
      
      if (success) {
        logger.debug('Place data invalidated', { placeId });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to invalidate place data', { placeId, error: error.message });
      return false;
    }
  }

  async invalidateLocationSearches(latitude, longitude, radius = 5000) {
    try {
      // This would require pattern matching or keeping track of search keys
      // For now, we'll implement a simplified version
      const types = ['cafe', 'bar', 'restaurant'];
      const radiusValues = [500, 1000, 1500, 2000, 5000];
      
      const keys = [];
      types.forEach(type => {
        radiusValues.forEach(r => {
          keys.push(generateLocationCacheKey(latitude, longitude, r, type));
        });
      });
      
      const results = await Promise.all(
        keys.map(key => cache.del(key))
      );
      
      logger.debug('Location searches invalidated', { 
        latitude, 
        longitude, 
        keysCleared: keys.length 
      });
      
      return results.some(result => result);
    } catch (error) {
      logger.error('Failed to invalidate location searches', { 
        latitude, 
        longitude, 
        error: error.message 
      });
      return false;
    }
  }

  // Cache warming (pre-populate cache with frequently accessed data)
  async warmCache(userId, userData) {
    try {
      await this.cacheUser(userId, userData);
      
      // Could add more cache warming logic here
      logger.debug('Cache warmed for user', { userId });
      return true;
    } catch (error) {
      logger.error('Failed to warm cache', { userId, error: error.message });
      return false;
    }
  }

  // Cache statistics and monitoring
  async getCacheStats() {
    try {
      const stats = await cache.getStats();
      return {
        ...stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get cache statistics', { error: error.message });
      return null;
    }
  }

  // Bulk operations
  async setMultiple(entries) {
    try {
      const results = await Promise.all(
        entries.map(({ key, value, ttl }) => cache.set(key, value, ttl))
      );
      
      const successCount = results.filter(result => result).length;
      logger.debug('Bulk cache set completed', { 
        total: entries.length, 
        successful: successCount 
      });
      
      return successCount === entries.length;
    } catch (error) {
      logger.error('Bulk cache set failed', { error: error.message });
      return false;
    }
  }

  async getMultiple(keys) {
    try {
      const results = await Promise.all(
        keys.map(key => cache.get(key))
      );
      
      const keyValuePairs = {};
      keys.forEach((key, index) => {
        keyValuePairs[key] = results[index];
      });
      
      return keyValuePairs;
    } catch (error) {
      logger.error('Bulk cache get failed', { error: error.message });
      return {};
    }
  }

  // Cache health check
  async healthCheck() {
    try {
      const testKey = 'health_check_test';
      const testValue = { timestamp: Date.now() };
      
      // Test set operation
      const setSuccess = await cache.set(testKey, testValue, 60);
      if (!setSuccess) {
        throw new Error('Cache set operation failed');
      }
      
      // Test get operation
      const getValue = await cache.get(testKey);
      if (!getValue || getValue.timestamp !== testValue.timestamp) {
        throw new Error('Cache get operation failed');
      }
      
      // Test delete operation
      const delSuccess = await cache.del(testKey);
      if (!delSuccess) {
        throw new Error('Cache delete operation failed');
      }
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        operations: ['set', 'get', 'delete']
      };
    } catch (error) {
      logger.error('Cache health check failed', { error: error.message });
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create and export singleton instance
const redisService = new RedisService();

module.exports = redisService;