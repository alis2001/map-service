// config/redis.js
// Location: /backend/config/redis.js

const redis = require('redis');
const logger = require('../utils/logger');

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  
  // Connection options
  connectTimeout: 10000, // 10 seconds
  commandTimeout: 5000,  // 5 seconds
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  
  // Retry strategy
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      logger.error('Redis connection refused');
      return new Error('Redis server connection refused');
    }
    
    if (options.total_retry_time > 1000 * 60 * 60) {
      logger.error('Redis retry time exhausted');
      return new Error('Redis retry time exhausted');
    }
    
    if (options.attempt > 10) {
      logger.error('Redis max retry attempts exceeded');
      return undefined;
    }
    
    // Reconnect after
    return Math.min(options.attempt * 100, 3000);
  }
};

// Create Redis client
const createRedisClient = () => {
  const client = redis.createClient({
    socket: {
      host: redisConfig.host,
      port: redisConfig.port,
      connectTimeout: redisConfig.connectTimeout,
      commandTimeout: redisConfig.commandTimeout
    },
    password: redisConfig.password,
    database: 0, // Use database 0
    retry_strategy: redisConfig.retry_strategy
  });

  // Event listeners
  client.on('connect', () => {
    logger.info('Redis client connected', {
      host: redisConfig.host,
      port: redisConfig.port
    });
  });

  client.on('ready', () => {
    logger.info('Redis client ready');
  });

  client.on('error', (err) => {
    logger.error('Redis client error', {
      error: err.message,
      code: err.code,
      errno: err.errno
    });
  });

  client.on('end', () => {
    logger.warn('Redis client connection ended');
  });

  client.on('reconnecting', () => {
    logger.info('Redis client reconnecting');
  });

  return client;
};

// Initialize Redis client
const redisClient = createRedisClient();

// Connect to Redis
const connectRedis = async () => {
  try {
    await redisClient.connect();
    logger.info('Redis connection established successfully');
    return true;
  } catch (err) {
    logger.error('Failed to connect to Redis', {
      error: err.message,
      host: redisConfig.host,
      port: redisConfig.port
    });
    return false;
  }
};

// Disconnect from Redis
const disconnectRedis = async () => {
  try {
    await redisClient.disconnect();
    logger.info('Redis disconnected successfully');
  } catch (err) {
    logger.error('Error disconnecting from Redis', {
      error: err.message
    });
  }
};

// Cache operations
const cache = {
  // Set a value with optional expiration (in seconds)
  async set(key, value, expiration = 3600) {
    try {
      const serializedValue = JSON.stringify(value);
      
      if (expiration) {
        await redisClient.setEx(key, expiration, serializedValue);
      } else {
        await redisClient.set(key, serializedValue);
      }
      
      logger.debug('Cache set successful', { key, expiration });
      return true;
    } catch (err) {
      logger.error('Cache set failed', {
        key,
        error: err.message
      });
      return false;
    }
  },

  // Get a value from cache
  async get(key) {
    try {
      const value = await redisClient.get(key);
      
      if (value === null) {
        logger.debug('Cache miss', { key });
        return null;
      }
      
      const parsedValue = JSON.parse(value);
      logger.debug('Cache hit', { key });
      return parsedValue;
    } catch (err) {
      logger.error('Cache get failed', {
        key,
        error: err.message
      });
      return null;
    }
  },

  // Delete a value from cache
  async del(key) {
    try {
      const result = await redisClient.del(key);
      logger.debug('Cache delete', { key, deleted: result > 0 });
      return result > 0;
    } catch (err) {
      logger.error('Cache delete failed', {
        key,
        error: err.message
      });
      return false;
    }
  },

  // Check if key exists
  async exists(key) {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (err) {
      logger.error('Cache exists check failed', {
        key,
        error: err.message
      });
      return false;
    }
  },

  // Set expiration for a key
  async expire(key, seconds) {
    try {
      const result = await redisClient.expire(key, seconds);
      return result === 1;
    } catch (err) {
      logger.error('Cache expire failed', {
        key,
        seconds,
        error: err.message
      });
      return false;
    }
  },

  // Get TTL for a key
  async ttl(key) {
    try {
      const ttl = await redisClient.ttl(key);
      return ttl;
    } catch (err) {
      logger.error('Cache TTL failed', {
        key,
        error: err.message
      });
      return -1;
    }
  },

  // Clear all cache
  async flush() {
    try {
      await redisClient.flushDb();
      logger.info('Cache flushed successfully');
      return true;
    } catch (err) {
      logger.error('Cache flush failed', {
        error: err.message
      });
      return false;
    }
  },

  // Get cache statistics
  async getStats() {
    try {
      const info = await redisClient.info('stats');
      const keyspace = await redisClient.info('keyspace');
      
      return {
        connected: redisClient.isReady,
        stats: info,
        keyspace: keyspace
      };
    } catch (err) {
      logger.error('Failed to get cache stats', {
        error: err.message
      });
      return {
        connected: false,
        error: err.message
      };
    }
  }
};

// Health check
const healthCheck = async () => {
  try {
    await redisClient.ping();
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (err) {
    logger.error('Redis health check failed', { error: err.message });
    return { 
      status: 'unhealthy', 
      error: err.message, 
      timestamp: new Date().toISOString() 
    };
  }
};

module.exports = {
  redisClient,
  connectRedis,
  disconnectRedis,
  cache,
  healthCheck
};