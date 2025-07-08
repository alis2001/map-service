// middleware/notFound.js
// Location: /backend/middleware/notFound.js

const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.originalUrl} not found`,
      statusCode: 404
    },
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: {
      health: 'GET /health',
      root: 'GET /',
      auth: 'POST /api/v1/auth/*',
      location: 'GET|POST /api/v1/location/*',
      places: 'GET /api/v1/places/*'
    }
  });
};

module.exports = notFound;