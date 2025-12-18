const logger = require('../config/logger');

/**
 * Error handling middleware
 * Standardizes error responses across all endpoints
 * Format: { error: { code: "STRING_CODE", message: "Human readable", details: {...} } }
 */
function errorHandler(err, req, res, next) {
  // Log error with request context
  logger.error('Error occurred', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack
  });

  // Default to 500 server error
  const statusCode = err.statusCode || err.status || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected error occurred';
  const details = err.details || {};

  // Send standardized error response
  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(Object.keys(details).length > 0 && { details })
    }
  });
}

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.path}`);
  error.statusCode = 404;
  error.code = 'NOT_FOUND';
  next(error);
}

module.exports = {
  errorHandler,
  notFoundHandler
};
