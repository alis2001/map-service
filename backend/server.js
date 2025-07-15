// server.js - UPDATED VERSION with Enhanced Service Initialization
// Location: /backend/server.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const dotenv = require('dotenv');
const searchRoutes = require('./routes/searchRoutes');


// Load environment variables
dotenv.config();

// Import database connection
const { prisma, testConnection } = require('./config/prisma');
const { connectRedis } = require('./config/redis');
const { authenticateToken } = require('./middleware/auth');


// Import middleware
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

// Import routes (only places - no auth needed)
const placesRoutes = require('./routes/placesRoutes');

// Initialize Express app
const app = express();

// Global service status tracking
let serviceStatus = {
  database: { status: 'initializing', connectedAt: null, error: null },
  redis: { status: 'initializing', connectedAt: null, error: null },
  googlePlaces: { status: 'initializing', initializedAt: null, error: null },
  server: { status: 'starting', startedAt: null },
  overall: 'initializing'
};

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "https:"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"]
    }
  }
}));

// CORS configuration - FIXED to include all ports
const corsOptions = {
  origin: process.env.FRONTEND_URL ? 
    process.env.FRONTEND_URL.split(',').map(url => url.trim()) : 
    ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Add preflight handling
app.options('*', cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ENHANCED: Comprehensive health check endpoint with service status
app.get('/health', async (req, res) => {
  try {
    console.log('🏥 Health check requested');
    
    // Test database connection
    let dbHealthy = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbHealthy = true;
      serviceStatus.database.status = 'healthy';
      serviceStatus.database.error = null;
    } catch (dbError) {
      console.error('❌ Database health check failed:', dbError.message);
      serviceStatus.database.status = 'unhealthy';
      serviceStatus.database.error = dbError.message;
    }

    // Test Redis connection (optional - don't fail if Redis is down)
    let redisHealthy = false;
    try {
      const { cache } = require('./config/redis');
      await cache.get('health_check_test');
      redisHealthy = true;
      serviceStatus.redis.status = 'healthy';
      serviceStatus.redis.error = null;
    } catch (redisError) {
      console.warn('⚠️ Redis health check failed:', redisError.message);
      serviceStatus.redis.status = 'degraded';
      serviceStatus.redis.error = redisError.message;
    }

    // Test Google Places service
    let googlePlacesHealthy = false;
    try {
      const googlePlacesService = require('./services/googlePlacesService');
      const placesHealth = await googlePlacesService.healthCheck();
      googlePlacesHealthy = placesHealth.status === 'healthy' || placesHealth.status === 'degraded';
      serviceStatus.googlePlaces.status = placesHealth.status;
      serviceStatus.googlePlaces.error = placesHealth.error || null;
    } catch (placesError) {
      console.warn('⚠️ Google Places health check failed:', placesError.message);
      serviceStatus.googlePlaces.status = 'degraded';
      serviceStatus.googlePlaces.error = placesError.message;
    }

    // Determine overall status
    let overallStatus = 'OK';
    if (!dbHealthy) {
      overallStatus = 'CRITICAL'; // Database is critical
    } else if (!googlePlacesHealthy) {
      overallStatus = 'DEGRADED'; // Google Places issues are degraded but workable
    } else if (!redisHealthy) {
      overallStatus = 'DEGRADED'; // Redis issues are degraded but workable
    }

    serviceStatus.overall = overallStatus;

    const healthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: {
        database: {
          status: serviceStatus.database.status,
          type: 'PostgreSQL',
          connectedAt: serviceStatus.database.connectedAt,
          error: serviceStatus.database.error
        },
        redis: {
          status: serviceStatus.redis.status,
          type: 'Redis Cache',
          connectedAt: serviceStatus.redis.connectedAt,
          error: serviceStatus.redis.error
        },
        googlePlaces: {
          status: serviceStatus.googlePlaces.status,
          type: 'Google Places API',
          initializedAt: serviceStatus.googlePlaces.initializedAt,
          error: serviceStatus.googlePlaces.error
        }
      },
      ready: overallStatus === 'OK' || overallStatus === 'DEGRADED'
    };

    console.log('🏥 Health check completed:', {
      status: overallStatus,
      database: serviceStatus.database.status,
      redis: serviceStatus.redis.status,
      googlePlaces: serviceStatus.googlePlaces.status
    });

    // Return appropriate status code
    const statusCode = overallStatus === 'CRITICAL' ? 503 : 200;
    res.status(statusCode).json(healthResponse);

  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      error: error.message,
      ready: false
    });
  }
});

// API routes (only places API)
app.use('/api/v1/places', placesRoutes);
// Search panel ROute
app.use('/api/v1/search', searchRoutes);
// Root endpoint with service status
app.get('/', (req, res) => {
  res.json({
    message: 'Map Service API - Microservice for Coffee & Bar Locations',
    version: '1.0.0',
    status: serviceStatus.overall,
    services: {
      database: serviceStatus.database.status,
      redis: serviceStatus.redis.status,
      googlePlaces: serviceStatus.googlePlaces.status
    },
    endpoints: {
      health: '/health',
      places: '/api/v1/places',
      nearbyPlaces: '/api/v1/places/nearby',
      searchPlaces: '/api/v1/places/search'
    },
    note: 'Authentication handled by main application',
    ready: serviceStatus.overall === 'OK' || serviceStatus.overall === 'DEGRADED'
  });
});

const usersRoutes = require('./routes/users');
const invitesRoutes = require('./routes/invites');

// Register new routes with authentication middleware
app.use('/api/v1/users', authenticateToken, usersRoutes);
app.use('/api/v1/invites', authenticateToken, invitesRoutes);

// 404 handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

// ENHANCED: Comprehensive service initialization function
async function initializeServices() {
  console.log('🔧 Starting service initialization...');
  
  const results = {
    database: false,
    redis: false,
    googlePlaces: false
  };

  // 1. Initialize Database (CRITICAL)
  try {
    console.log('🗄️ Initializing database connection...');
    const dbConnected = await testConnection();
    
    if (dbConnected) {
      console.log('✅ Database connected successfully');
      serviceStatus.database.status = 'healthy';
      serviceStatus.database.connectedAt = new Date().toISOString();
      serviceStatus.database.error = null;
      results.database = true;
    } else {
      throw new Error('Database connection failed');
    }
  } catch (dbError) {
    console.error('❌ Database initialization failed:', dbError.message);
    serviceStatus.database.status = 'unhealthy';
    serviceStatus.database.error = dbError.message;
    // Don't continue if database fails
    return results;
  }

  // 2. Initialize Redis (NON-CRITICAL)
  try {
    console.log('🔴 Initializing Redis connection...');
    const redisConnected = await connectRedis();
    
    if (redisConnected) {
      console.log('✅ Redis connected successfully');
      serviceStatus.redis.status = 'healthy';
      serviceStatus.redis.connectedAt = new Date().toISOString();
      serviceStatus.redis.error = null;
      results.redis = true;
    } else {
      throw new Error('Redis connection failed');
    }
  } catch (redisError) {
    console.warn('⚠️ Redis initialization failed (non-critical):', redisError.message);
    serviceStatus.redis.status = 'degraded';
    serviceStatus.redis.error = redisError.message;
    console.log('📱 App will continue without caching');
    // Continue even if Redis fails
  }

  // 3. Initialize Google Places Service (NON-CRITICAL but important)
  // 3. Initialize Google Places Service with Comprehensive Search
  try {
    console.log('🗺️ Initializing Google Places Service with comprehensive search...');
    const googlePlacesService = require('./services/googlePlacesService');
    const placesInitialized = await googlePlacesService.initialize();
    
    if (placesInitialized) {
      console.log('✅ Google Places Service initialized successfully with comprehensive search');
      console.log('🔍 Comprehensive search features enabled:');
      console.log('   - Multiple search strategies (primary, secondary, text, establishment)');
      console.log('   - Enhanced Italian venue detection');
      console.log('   - Maximum venue coverage');
      
      serviceStatus.googlePlaces.status = 'healthy';
      serviceStatus.googlePlaces.initializedAt = new Date().toISOString();
      serviceStatus.googlePlaces.error = null;
      serviceStatus.googlePlaces.features = [
        'comprehensive_search',
        'multi_strategy_detection',
        'italian_venue_optimization',
        'maximum_coverage'
      ];
      results.googlePlaces = true;
    } else {
      throw new Error('Google Places Service initialization returned false');
    }
  } catch (placesError) {
    console.warn('⚠️ Google Places Service initialization failed (degraded mode):', placesError.message);
    console.log('📱 Comprehensive search unavailable, falling back to basic mode');
    serviceStatus.googlePlaces.status = 'degraded';
    serviceStatus.googlePlaces.error = placesError.message;
    serviceStatus.googlePlaces.fallbackMode = 'basic_search';
    console.log('📱 App will continue with limited places functionality');
    // Continue even if Google Places fails
  }

  // 4. Initialize Search Service (for city/place search)
  try {
    console.log('🔍 Initializing Search Service...');
    const searchService = require('./services/searchService');
    await searchService.initialize();
    console.log('✅ Search Service initialized successfully');
    console.log(`📊 Loaded Italian cities database with ${(await searchService.healthCheck()).citiesLoaded} cities`);
    results.searchService = true;
  } catch (searchError) {
    console.warn('⚠️ Search Service initialization failed:', searchError.message);
    console.log('📱 City search will be unavailable');
    results.searchService = false;
  }

  return results;
}

// Server configuration
const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || '0.0.0.0';

// ENHANCED: Start server with comprehensive initialization
const server = app.listen(PORT, HOST, async () => {
  console.log('🚀='.repeat(50));
  console.log(`🚀 Map Service Server Starting`);
  console.log(`🚀 Port: ${PORT}`);
  console.log(`🚀 Host: ${HOST}`);
  console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🚀 Database: ${process.env.DB_NAME || 'map_service'}`);
  console.log(`🚀 Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`);
  console.log('🚀='.repeat(50));

  serviceStatus.server.status = 'running';
  serviceStatus.server.startedAt = new Date().toISOString();

  // Initialize all services
  console.log('\n🔧 Initializing services...');
  const initResults = await initializeServices();

  // Determine overall service status
  if (initResults.database) {
    if (initResults.redis && initResults.googlePlaces) {
      serviceStatus.overall = 'OK';
      console.log('✅ All services initialized successfully - Status: OK');
    } else {
      serviceStatus.overall = 'DEGRADED';
      console.log('⚠️ Some services failed but core functionality available - Status: DEGRADED');
    }
  } else {
    serviceStatus.overall = 'CRITICAL';
    console.log('❌ Critical services failed - Status: CRITICAL');
  }

  console.log('\n📊 Service Status Summary:');
  console.log(`   Database: ${serviceStatus.database.status}`);
  console.log(`   Redis: ${serviceStatus.redis.status}`);
  console.log(`   Google Places: ${serviceStatus.googlePlaces.status}`);
  console.log(`   Overall: ${serviceStatus.overall}`);

  console.log('\n🎯 Server is ready!');
  console.log(`📡 Health Check: http://localhost:${PORT}/health`);
  console.log(`📡 API Test: http://localhost:${PORT}/api/v1/places/nearby?latitude=45.0703&longitude=7.6869&type=cafe&limit=3`);

  // Run self-test if services are healthy
  if (serviceStatus.overall === 'OK') {
    setTimeout(async () => {
      try {
        console.log('\n🧪 Running self-test...');
        const googlePlacesService = require('./services/googlePlacesService');
        const testResult = await googlePlacesService.searchNearby(45.0703, 7.6869, {
          type: 'cafe',
          radius: 1000,
          limit: 1
        });
        console.log('✅ Self-test passed:', { placesFound: testResult.count });
      } catch (testError) {
        console.error('❌ Self-test failed:', testError.message);
        serviceStatus.googlePlaces.status = 'degraded';
        serviceStatus.overall = 'DEGRADED';
      }
    }, 3000);
  }
});

// Enhanced graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n👋 ${signal} received, shutting down gracefully`);
  
  serviceStatus.overall = 'shutting_down';
  
  try {
    // Close database connections
    await prisma.$disconnect();
    console.log('🗄️ Database disconnected');
    
    // Close Redis connections
    try {
      const { disconnectRedis } = require('./config/redis');
      await disconnectRedis();
      console.log('🔴 Redis disconnected');
    } catch (redisError) {
      console.warn('⚠️ Redis disconnect error:', redisError.message);
    }
    
    // Close server
    server.close(() => {
      console.log('🌐 HTTP server closed');
      console.log('💀 Process terminated gracefully');
      process.exit(0);
    });
    
    // Force exit after 10 seconds
    setTimeout(() => {
      console.log('⏰ Forcing exit after 10 seconds');
      process.exit(1);
    }, 10000);
    
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Enhanced error handling
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  serviceStatus.overall = 'error';
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  serviceStatus.overall = 'error';
  gracefulShutdown('UNHANDLED_REJECTION');
});

module.exports = app;