module.exports = (err, req, res, next) => {
  console.error('🔥 Error Handler:', err);
  
  // Handle Prisma errors
  if (err.code === 'P2002') {
    return res.status(400).json({
      error: 'UNIQUE_CONSTRAINT_VIOLATION',
      message: 'This data already exists',
      timestamp: new Date().toISOString()
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Invalid token',
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'TOKEN_EXPIRED', 
      message: 'Token expired',
      timestamp: new Date().toISOString()
    });
  }

  // Default error
  res.status(err.status || 500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    timestamp: new Date().toISOString()
  });
};
