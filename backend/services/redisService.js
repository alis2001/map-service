// services/redisService.js - OPTIMIZED VERSION with Extended Caching
// Location: /backend/services/redisService.js

const { cache } = require('../config/redis');
const logger = require('../utils/logger');
const { generateCacheKey, generateLocationCacheKey, generateUserCacheKey } = require('../utils/helpers');

// Cache TTL configurations (in seconds) - EXTENDED for 10,000 users scenario
const CACHE_TTL = {
  user: 3600,              // 1 hour
  userLocation: 1800,      // 30 minutes
  places: 172800,          // 48 HOURS for places (EXTENDED!)
  placeDetails: 604800,    // 7 DAYS for place details (EXTENDED!)
  nearbySearch: 86400,     // 24 HOURS for nearby searches (EXTENDED!)
  textSearch: 43200,       // 12 HOURS for text searches (EXTENDED!)
  authAttempts: 900,       // 15 minutes
  rateLimit: 3600,         // 1 hour
  session: 86400,          // 24 hours
  statistics: 1800         // 30 minutes
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

// Cache monitoring
let cacheStats = {
  hits: 0,
  misses: 0,
  saves: 0,
  resetTime: Date.now()
};

const logCacheHit = () => {
  cacheStats.hits++;
  const hitRate = (cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100).toFixed(1);
  console.log(`⚡ CACHE HIT! Hit rate: ${hitRate}% (${cacheStats.hits}/${cacheStats.hits + cacheStats.misses})`);
};

const logCacheMiss = () => {
  cacheStats.misses++;
  const hitRate = (cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100).toFixed(1);
  console.log(`💸 CACHE MISS. Hit rate: ${hitRate}% (${cacheStats.hits}/${cacheStats.hits + cacheStats.misses})`);
};

const logCacheSave = () => {
  cacheStats.saves++;
  console.log(`💾 CACHE SAVED. Total saves: ${cacheStats.saves}`);
};

class RedisService {
  // User caching
  async cacheUser(userId, userData) {
    try {
      const key = generateUserCacheKey(userId);
      const success = await cache.set(key, userData, CACHE_TTL.user);
      
      if (success) {
        logger.debug('User cached successfully', { userId });
        logCacheSave();
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
        logCacheHit();
      } else {
        logger.debug('User cache miss', { userId });
        logCacheMiss();
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
        logCacheSave();
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
      const location = await cache.get(key);
      
      if (location) {
        logCacheHit();
      } else {
        logCacheMiss();
      }
      
      return location;
    } catch (error) {
      logger.error('Failed to get user location from cache', { userId, error: error.message });
      return null;
    }
  }

  // Places caching with EXTENDED TTL for 10,000 users
  async cacheNearbyPlaces(latitude, longitude, radius, type, places) {
    try {
      const key = generateLocationCacheKey(latitude, longitude, radius, type);
      const success = await cache.set(key, places, CACHE_TTL.nearbySearch); // 24 HOURS!
      
      if (success) {
        logger.debug('Nearby places cached for 24 HOURS', {
          latitude,
          longitude,
          radius,
          type,
          count: places.length,
          ttl: '24 HOURS'
        });
        logCacheSave();
        console.log(`🏪 PLACES CACHED FOR 24 HOURS: ${places.length} places - Perfect for 10,000 users!`);
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
        logCacheHit();
        logger.debug('Nearby places cache hit - NO API CALL NEEDED!', {
          latitude,
          longitude,
          radius,
          type,
          count: places.length
        });
        console.log(`⚡ 24-HOUR CACHE HIT: ${places.length} places - Saving €0.05+ API cost!`);
      } else {
        logCacheMiss();
        logger.debug('Nearby places cache miss', {
          latitude,
          longitude,
          radius,
          type
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
      const success = await cache.set(key, placeData, CACHE_TTL.placeDetails); // 7 DAYS!
      
      if (success) {
        logger.debug('Place details cached for 7 DAYS', { placeId });
        logCacheSave();
        console.log(`🏢 PLACE DETAILS CACHED FOR 7 DAYS: ${placeId} - Perfect for repeat visits!`);
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
      const details = await cache.get(key);
      
      if (details) {
        logCacheHit();
        console.log(`⚡ 7-DAY CACHE HIT: Place details for ${placeId} - Saving €0.05+ API cost!`);
      } else {
        logCacheMiss();
      }
      
      return details;
    } catch (error) {
      logger.error('Failed to get place details from cache', { placeId, error: error.message });
      return null;
    }
  }

  // Text search caching with EXTENDED TTL
  async cacheTextSearch(query, latitude, longitude, results) {
    try {
      const key = generateCacheKey(CACHE_PREFIXES.textSearch, query, latitude, longitude);
      const success = await cache.set(key, results, CACHE_TTL.textSearch); // 12 HOURS!
      
      if (success) {
        logger.debug('Text search results cached for 12 HOURS', { query, count: results.length });
        logCacheSave();
        console.log(`🔍 SEARCH CACHED FOR 12 HOURS: "${query}" - Perfect for popular searches!`);
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
      const results = await cache.get(key);
      
      if (results) {
        logCacheHit();
        console.log(`⚡ 12-HOUR SEARCH CACHE HIT: "${query}" - Saving €0.05+ API cost!`);
      } else {
        logCacheMiss();
      }
      
      return results;
    } catch (error) {
      logger.error('Failed to get text search from cache', { query, error: error.message });
      return null;
    }
  }

  // Authentication attempts caching
  async cacheAuthAttempts(identifier, attempts) {
    try {
      const key = generateCacheKey(CACHE_PREFIXES.authAttempts, identifier);
      const success = await cache.set(key, attempts, CACHE_TTL.authAttempts);
      
      if (success) {
        logger.debug('Auth attempts cached', { identifier, attempts });
      }
      return success;
    } catch (error) {
      logger.error('Failed to cache auth attempts', { identifier, error: error.message });
      return false;
    }
  }

  async getAuthAttempts(identifier) {
    try {
      const key = generateCacheKey(CACHE_PREFIXES.authAttempts, identifier);
      return await cache.get(key);
    } catch (error) {
      logger.error('Failed to get auth attempts from cache', { identifier, error: error.message });
      return null;
    }
  }

  // Rate limiting
  async checkRateLimit(identifier, action, limit = 100, windowMs = 3600000) {
    try {
      const key = generateCacheKey(CACHE_PREFIXES.rateLimit, action, identifier);
      const current = await cache.get(key);
      
      const now = Date.now();
      const windowStart = now - windowMs;
      
      let requests = current || [];
      
      // Filter requests within the current window
      requests = requests.filter(timestamp => timestamp > windowStart);
      
      if (requests.length >= limit) {
        return {
          allowed: false,
          count: requests.length,
          limit,
          resetTime: requests[0] + windowMs
        };
      }
      
      // Add current request
      requests.push(now);
      
      // Cache updated requests
      const ttl = windowMs > 0 ? Math.floor(windowMs / 1000) : null;
      if (ttl) {
        await cache.set(key, requests, ttl);
      } else {
        await cache.set(key, requests);
      }
      
      return {
        allowed: true,
        count: requests.length,
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
        logCacheSave();
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
      const session = await cache.get(key);
      
      if (session) {
        logCacheHit();
      } else {
        logCacheMiss();
      }
      
      return session;
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
        logCacheSave();
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
      const stats = await cache.get(key);
      
      if (stats) {
        logCacheHit();
      } else {
        logCacheMiss();
      }
      
      return stats;
    } catch (error) {
      logger.error('Failed to get statistics from cache', { statType, error: error.message });
      return null;
    }
  }

  // Bulk invalidation
  async invalidateLocationSearches(latitude, longitude) {
    try {
      // This is a simplified approach - Redis doesn't have built-in pattern matching or keeping track of search keys
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
        monitoring: cacheStats,
        timestamp: new Date().toISOString(),
        ttlSettings: {
          places: '48 HOURS',
          placeDetails: '7 DAYS',
          nearbySearch: '24 HOURS',
          textSearch: '12 HOURS'
        }
      };
    } catch (error) {
      logger.error('Failed to get cache statistics', { error: error.message });
      return {
        monitoring: cacheStats,
        timestamp: new Date().toISOString(),
        ttlSettings: {
          places: '48 HOURS',
          placeDetails: '7 DAYS',
          nearbySearch: '24 HOURS',
          textSearch: '12 HOURS'
        }
      };
    }
  }

  // Export cache stats for monitoring
  getMonitoringStats() {
    return {
      ...cacheStats,
      hitRate: cacheStats.hits > 0 ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100).toFixed(1) + '%' : '0%',
      moneySaved: `€${(cacheStats.hits * 0.05).toFixed(2)}`,
      extendedCaching: {
        places: '48 HOURS - Perfect for 10,000 users',
        placeDetails: '7 DAYS - Places rarely change',
        nearbySearch: '24 HOURS - Same area, same results',
        textSearch: '12 HOURS - Popular searches cached'
      }
    };
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
      
      return successCount;
    } catch (error) {
      logger.error('Bulk cache set failed', { error: error.message });
      return 0;
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
      
      logger.debug('Bulk cache get completed', { keyCount: keys.length });
      return keyValuePairs;
    } catch (error) {
      logger.error('Bulk cache get failed', { error: error.message });
      return {};
    }
  }

  // Clear all cache (use with caution)
  async clearAll() {
    try {
      await cache.clear();
      
      // Reset monitoring stats
      cacheStats = {
        hits: 0,
        misses: 0,
        saves: 0,
        resetTime: Date.now()
      };
      
      logger.info('All cache cleared');
      return true;
    } catch (error) {
      logger.error('Failed to clear all cache', { error: error.message });
      return false;
    }
  }
}

module.exports = new RedisService();