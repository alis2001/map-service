// server.js - UPDATED VERSION with User Discovery System Integration
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

// Import routes with error handling
let placesRoutes, usersRoutes, invitesRoutes;

try {
  placesRoutes = require('./routes/placesRoutes');
  console.log('✅ Places routes loaded');
} catch (error) {
  console.error('❌ Places routes failed:', error.message);
  placesRoutes = express.Router(); // Fallback empty router
}

try {
  usersRoutes = require('./routes/users');
  console.log('✅ Users routes loaded');
} catch (error) {
  console.error('❌ Users routes failed:', error.message);
  usersRoutes = express.Router();
}

try {
  invitesRoutes = require('./routes/invites');
  console.log('✅ Invites routes loaded');
} catch (error) {
  console.error('❌ Invites routes failed:', error.message);
  invitesRoutes = express.Router();
}

// Initialize Express app
const app = express();

// Global service status tracking
let serviceStatus = {
  database: { status: 'initializing', connectedAt: null, error: null },
  redis: { status: 'initializing', connectedAt: null, error: null },
  googlePlaces: { status: 'initializing', initializedAt: null, error: null },
  userDiscovery: { status: 'initializing', enabledAt: null, error: null },
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

// Rate limiting with different limits for different endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

const userDiscoveryLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute for user discovery
  message: 'Too many user discovery requests, please slow down.'
});

const locationUpdateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute  
  max: 10, // 10 location updates per minute
  message: 'Too many location updates, please wait.'
});

app.use('/api/', generalLimiter);

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

    // Test User Discovery system
    let userDiscoveryHealthy = false;
    try {
      // Test if we can query user tables
      await prisma.$queryRaw`SELECT COUNT(*) as user_count FROM user_live_locations WHERE "isLive" = true`;
      userDiscoveryHealthy = true;
      serviceStatus.userDiscovery.status = 'healthy';
      serviceStatus.userDiscovery.error = null;
    } catch (userError) {
      console.warn('⚠️ User Discovery health check failed:', userError.message);
      serviceStatus.userDiscovery.status = 'degraded';
      serviceStatus.userDiscovery.error = userError.message;
    }

    // Determine overall status
    let overallStatus = 'OK';
    if (!dbHealthy) {
      overallStatus = 'CRITICAL'; // Database is critical
    } else if (!googlePlacesHealthy || !userDiscoveryHealthy) {
      overallStatus = 'DEGRADED'; // Google Places or User Discovery issues are degraded but workable
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
        },
        userDiscovery: {
          status: serviceStatus.userDiscovery.status,
          type: 'User Discovery System',
          enabledAt: serviceStatus.userDiscovery.enabledAt,
          error: serviceStatus.userDiscovery.error
        }
      },
      ready: overallStatus === 'OK' || overallStatus === 'DEGRADED'
    };

    console.log('🏥 Health check completed:', {
      status: overallStatus,
      database: serviceStatus.database.status,
      redis: serviceStatus.redis.status,
      googlePlaces: serviceStatus.googlePlaces.status,
      userDiscovery: serviceStatus.userDiscovery.status
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

// API routes with proper rate limiting and error handling
try {
  app.use('/api/v1/places', placesRoutes);
  console.log('✅ Places routes mounted');
} catch (error) {
  console.error('❌ Failed to mount places routes:', error.message);
}

// Public cities endpoint (no auth required)
app.get("/api/v1/cities", async (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query;
    
    if (query) {
      const searchService = require("./services/searchService");
      const cities = await searchService.searchCities(query, parseInt(limit));
      
      res.json({
        success: true,
        cities: cities.map(city => ({
          name: city.name,
          displayName: city.displayName,
          coordinates: city.coordinates,
          userCount: 0
        })),
        count: cities.length
      });
    } else {
      // Return sample popular cities
      const cities = [
        { name: "milano", displayName: "Milano", userCount: 0, onlineNow: 0 },
        { name: "roma", displayName: "Roma", userCount: 0, onlineNow: 0 },
        { name: "torino", displayName: "Torino", userCount: 0, onlineNow: 0 }
      ];
      
      res.json({
        success: true,
        cities,
        count: cities.length
      });
    }
  } catch (error) {
    console.error("Cities error:", error);
    res.status(500).json({ error: "Failed to get cities" });
  }
});

app.get("/api/v1/user/search", authenticateToken, async (req, res) => {
  try {
    const { lat, lng, radius = 15000, limit = 10 } = req.query;
    const currentUserId = req.user?.id;
    
    if (!lat || !lng) {
      return res.status(400).json({ error: "Latitude and longitude required" });
    }

    console.log(`👥 Searching for users near ${lat}, ${lng} within ${radius}m (excluding user: ${currentUserId})`);

    // First, get nearby users from location table
    const nearbyUsers = await prisma.userLiveLocation.findMany({
      where: {
        AND: [
          { isLive: true },
          { NOT: { userId: currentUserId } },
          {
            lastSeen: {
              gte: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
            }
          }
        ]
      },
      take: parseInt(limit) * 2, // Get more to filter by distance
      orderBy: { lastSeen: 'desc' }
    });

    console.log(`📍 Found ${nearbyUsers.length} live users before distance filtering`);

    // Calculate distances and filter
    const usersWithDistance = nearbyUsers.map(user => {
      const distance = calculateDistance(
        parseFloat(lat),
        parseFloat(lng),
        user.latitude,
        user.longitude
      );
      return { ...user, distance };
    }).filter(user => user.distance <= parseInt(radius))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, parseInt(limit));

    console.log(`📍 Found ${usersWithDistance.length} users within ${radius}m`);

    // Get user profiles for those users
    const userIds = usersWithDistance.map(u => u.userId);
    const profiles = await prisma.userProfile.findMany({
      where: { userId: { in: userIds } }
    });

    console.log(`👤 Found ${profiles.length} user profiles`);

    // Update the getUserStatus function in your user search endpoint
    const getUserStatus = (lastSeen) => {
      if (!lastSeen) return 'offline';
      
      const now = new Date();
      const lastSeenDate = new Date(lastSeen);
      const diffMinutes = Math.floor((now - lastSeenDate) / (1000 * 60));
      
      console.log(`👤 Status check - Last seen: ${lastSeenDate}, Now: ${now}, Diff: ${diffMinutes} minutes`);
      
      if (diffMinutes < 2) return 'online';
      if (diffMinutes < 5) return 'active';
      if (diffMinutes < 15) return 'recent';
      if (diffMinutes < 30) return 'away';
      return 'offline';
    };

    const formatDistance = (distanceInMeters) => {
      if (distanceInMeters < 1000) {
        return `${Math.round(distanceInMeters)}m`;
      } else {
        return `${(distanceInMeters / 1000).toFixed(1)}km`;
      }
    };

    // In the users mapping section, replace the existing code with:
    const users = usersWithDistance.map(locationUser => {
      const profile = profiles.find(p => p.userId === locationUser.userId);
      
      console.log(`👤 Processing user ${profile?.firstName || 'Unknown'} - Distance: ${locationUser.distance}m, LastSeen: ${locationUser.lastSeen}`);
      
      return {
        userId: locationUser.userId,
        firstName: profile?.firstName || 'Anonymous',
        lastName: profile?.lastName || 'User',
        username: profile?.username || `User ${locationUser.userId.slice(0, 8)}`,
        profilePic: profile?.profilePic,
        bio: profile?.bio,
        city: locationUser.city,
        distance: Math.round(locationUser.distance || 0),
        formattedDistance: formatDistance(locationUser.distance || 0),
        isOnline: locationUser.isLive,
        status: getUserStatus(locationUser.lastSeen),
        lastSeen: locationUser.lastSeen,
        joinedAt: profile?.createdAt || locationUser.createdAt,
        latitude: locationUser.latitude,
        longitude: locationUser.longitude
      };
    });

    console.log(`✅ Returning ${users.length} formatted users`);

    res.json({
      success: true,
      users,
      count: users.length,
      searchRadius: parseInt(radius),
      excludedCurrentUser: currentUserId
    });

  } catch (error) {
    console.error('❌ User search error:', error);
    res.status(500).json({ 
      error: 'Failed to search users',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Helper function for distance calculation
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

try {
  app.use('/api/v1/search', searchRoutes);
  console.log('✅ Search routes mounted');
} catch (error) {
  console.error('❌ Failed to mount search routes:', error.message);
}

// User Discovery routes with authentication and rate limiting
try {
  app.use('/api/v1/users', authenticateToken, usersRoutes);
  console.log('✅ Users routes mounted');
} catch (error) {
  console.error('❌ Failed to mount users routes:', error.message);
}

try {
  app.use('/api/v1/invites', authenticateToken, invitesRoutes);
  console.log('✅ Invites routes mounted');
} catch (error) {
  console.error('❌ Failed to mount invites routes:', error.message);
}

// Root endpoint with enhanced service status
app.get('/', (req, res) => {
  res.json({
    message: 'Map Service API - Microservice for Coffee & Bar Locations + User Discovery',
    version: '1.0.0',
    status: serviceStatus.overall,
    services: {
      database: serviceStatus.database.status,
      redis: serviceStatus.redis.status,
      googlePlaces: serviceStatus.googlePlaces.status,
      userDiscovery: serviceStatus.userDiscovery.status
    },
    endpoints: {
      health: '/health',
      // Places API
      places: '/api/v1/places',
      nearbyPlaces: '/api/v1/places/nearby',
      searchPlaces: '/api/v1/places/search',
      // Public APIs (no auth)
      cities: '/api/v1/cities',
      userSearch: '/api/v1/user/search',
      // User Discovery API (authenticated)
      userProfile: '/api/v1/users/profile',
      locationUpdate: '/api/v1/users/location/update-with-city',
      // Invitations API
      sendInvite: '/api/v1/invites/send',
      receivedInvites: '/api/v1/invites/received'
    },
    features: [
      'place_discovery',
      'user_discovery', 
      'city_based_search',
      'meetup_invitations',
      'real_time_location'
    ],
    note: 'Authentication handled by main Caffis application via JWT',
    ready: serviceStatus.overall === 'OK' || serviceStatus.overall === 'DEGRADED'
  });
});

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
    googlePlaces: false,
    userDiscovery: false,
    searchService: false
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

  // 2. Initialize User Discovery System (CRITICAL for user features)
  try {
    console.log('👥 Initializing User Discovery System...');
    
    // Check if user discovery tables exist
    await prisma.$queryRaw`SELECT 1 FROM user_live_locations LIMIT 1`;
    await prisma.$queryRaw`SELECT 1 FROM meetup_invites LIMIT 1`;
    await prisma.$queryRaw`SELECT 1 FROM user_profiles LIMIT 1`;
    
    console.log('✅ User Discovery System initialized successfully');
    console.log('🔍 User Discovery features enabled:');
    console.log('   - City-based user discovery');
    console.log('   - Real-time location sharing');
    console.log('   - Coffee meetup invitations');
    console.log('   - Collaborative location selection');
    
    serviceStatus.userDiscovery.status = 'healthy';
    serviceStatus.userDiscovery.enabledAt = new Date().toISOString();
    serviceStatus.userDiscovery.error = null;
    results.userDiscovery = true;
    
  } catch (userError) {
    console.error('❌ User Discovery System initialization failed:', userError.message);
    console.log('📱 User discovery features will be unavailable');
    serviceStatus.userDiscovery.status = 'degraded';
    serviceStatus.userDiscovery.error = userError.message;
    // Continue without user discovery
  }

  // 3. Initialize Redis (NON-CRITICAL)
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

  // 4. Initialize Google Places Service (NON-CRITICAL but important)
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

  // 5. Initialize Search Service (for city/place search)
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
  console.log(`🚀 Caffis Map Service + User Discovery Server Starting`);
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
    if (initResults.userDiscovery && initResults.redis && initResults.googlePlaces) {
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
  console.log(`   User Discovery: ${serviceStatus.userDiscovery.status}`);
  console.log(`   Redis: ${serviceStatus.redis.status}`);
  console.log(`   Google Places: ${serviceStatus.googlePlaces.status}`);
  console.log(`   Overall: ${serviceStatus.overall}`);

  console.log('\n🎯 Server is ready!');
  console.log(`📡 Health Check: http://localhost:${PORT}/health`);
  console.log(`📡 Places API Test: http://localhost:${PORT}/api/v1/places/nearby?latitude=45.0703&longitude=7.6869&type=cafe&limit=3`);
  console.log(`📡 Cities API Test: http://localhost:${PORT}/api/v1/cities?q=milano&limit=3`);
  console.log(`📡 User Search Test: http://localhost:${PORT}/api/v1/user/search?lat=45.466647&lng=9.1906475&limit=5`);

  // Run self-test if services are healthy
  if (serviceStatus.overall === 'OK') {
    setTimeout(async () => {
      try {
        console.log('\n🧪 Running self-test...');
        
        // Test Google Places
        const googlePlacesService = require('./services/googlePlacesService');
        const testResult = await googlePlacesService.searchNearby(45.0703, 7.6869, {
          type: 'cafe',
          radius: 1000,
          limit: 1
        });
        
        // Test User Discovery (basic table check)
        const userStats = await prisma.$queryRaw`
          SELECT 
            COUNT(*) as total_users,
            COUNT(CASE WHEN "isLive" = true THEN 1 END) as active_users
          FROM user_live_locations
        `;
        
        console.log('✅ Self-test passed:', { 
          placesFound: testResult.count,
          userStats: userStats[0]
        });
      } catch (testError) {
        console.error('❌ Self-test failed:', testError.message);
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