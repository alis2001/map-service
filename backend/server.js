// server.js - Updated with Google Places Service Initialization
// Location: /backend/server.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import database connection
const { prisma, testConnection } = require('./config/prisma');
const { connectRedis } = require('./config/redis');

// Import services
const googlePlacesService = require('./services/googlePlacesService');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

// Import routes (only places - no auth needed)
const placesRoutes = require('./routes/placesRoutes');

// Initialize Express app
const app = express();

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

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

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

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbStatus = await testConnection();
    const placesHealth = await googlePlacesService.healthCheck();
    
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus ? 'connected' : 'disconnected',
      googlePlaces: placesHealth.status,
      version: '1.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'disconnected',
      googlePlaces: 'unhealthy',
      error: error.message
    });
  }
});

// API routes (only places API)
app.use('/api/v1/places', placesRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Map Service API - Microservice for Coffee & Bar Locations',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      places: '/api/v1/places',
      nearbyPlaces: '/api/v1/places/nearby',
      searchPlaces: '/api/v1/places/search'
    },
    note: 'Authentication handled by main application',
    status: {
      database: 'checking...',
      redis: 'checking...',
      googlePlaces: 'checking...'
    }
  });
});

// 404 handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

// Server configuration
const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || '0.0.0.0';

// Start server with proper initialization
const server = app.listen(PORT, HOST, async () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: ${process.env.DB_NAME || 'map_service'}`);
  console.log(`🔴 Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`);
  
  // Connect to Redis
  try {
    await connectRedis();
    console.log('✅ Redis connected successfully');
  } catch (error) {
    console.log('❌ Redis connection failed:', error.message);
    console.log('⚠️  App will continue without caching');
  }

  // Initialize Google Places Service
  try {
    const initialized = await googlePlacesService.initialize();
    if (initialized) {
      console.log('✅ Google Places Service initialized successfully');
    } else {
      console.log('⚠️  Google Places Service initialized with warnings');
    }
  } catch (error) {
    console.log('❌ Google Places Service initialization failed:', error.message);
    console.log('⚠️  Places API will be degraded');
  }

  // Test database connection
  try {
    await testConnection();
    console.log('✅ Database connection verified');
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
  }

  console.log('\n🎯 Ready to serve requests!');
  console.log(`📡 Test API: curl "http://localhost:${PORT}/api/v1/places/nearby?latitude=45.0703&longitude=7.6869&type=cafe&limit=3"`);
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n👋 ${signal} received, shutting down gracefully`);
  
  try {
    // Close database connections
    await prisma.$disconnect();
    console.log('🗄️  Database disconnected');
    
    // Close server
    server.close(() => {
      console.log('🌐 HTTP server closed');
      console.log('💀 Process terminated');
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

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

module.exports = app;