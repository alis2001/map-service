// middleware/errorHandler.js
// Location: /backend/middleware/errorHandler.js

const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error(err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = { message, statusCode: 400 };
  }

  // PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        error = {
          message: 'Duplicate entry found',
          statusCode: 400
        };
        break;
      case '23503': // Foreign key violation
        error = {
          message: 'Referenced record does not exist',
          statusCode: 400
        };
        break;
      case '23502': // Not null violation
        error = {
          message: 'Required field is missing',
          statusCode: 400
        };
        break;
      case '42P01': // Undefined table
        error = {
          message: 'Database table does not exist',
          statusCode: 500
        };
        break;
      case '28P01': // Invalid authorization
        error = {
          message: 'Database connection failed',
          statusCode: 500
        };
        break;
      default:
        error = {
          message: 'Database error occurred',
          statusCode: 500
        };
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  // Google Places API errors
  if (err.name === 'GooglePlacesError') {
    error = {
      message: err.message || 'Google Places API error',
      statusCode: err.statusCode || 500
    };
  }

  // Redis errors
  if (err.name === 'RedisError' || err.code === 'ECONNREFUSED') {
    error = {
      message: 'Cache service temporarily unavailable',
      statusCode: 503
    };
  }

  // Rate limit errors
  if (err.status === 429) {
    error = {
      message: 'Too many requests, please try again later',
      statusCode: 429
    };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: {
      message: error.message || 'Server Error',
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack,
        details: err 
      })
    },
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method
  });
};

module.exports = errorHandler;