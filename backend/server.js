// server.js - Main Express Server
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

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

// Import routes (commented out for now - we'll create these step by step)
// const locationRoutes = require('./routes/locationRoutes');
// const placesRoutes = require('./routes/placesRoutes');
// const authRoutes = require('./routes/authRoutes');

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
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus ? 'connected' : 'disconnected',
      version: '1.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'disconnected',
      error: error.message
    });
  }
});

// API routes (commented out for now - we'll add these step by step)
// app.use('/api/v1/auth', authRoutes);
// app.use('/api/v1/location', locationRoutes);
// app.use('/api/v1/places', placesRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Map Service API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/v1/auth',
      location: '/api/v1/location',
      places: '/api/v1/places'
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

// Start server
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: ${process.env.DB_NAME || 'map_service'}`);
  console.log(`🔴 Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  server.close(() => {
    console.log('💀 Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('👋 SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  server.close(() => {
    console.log('💀 Process terminated');
    process.exit(0);
  });
});

module.exports = app;