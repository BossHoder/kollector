const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

/**
 * Authentication middleware
 * Verifies JWT access token and attaches user info to request
 */
async function authenticate(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error = new Error('No token provided');
      error.statusCode = 401;
      error.code = 'UNAUTHORIZED';
      return next(error);
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token
    const jwtSecret = process.env.JWT_ACCESS_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_ACCESS_SECRET not configured');
    }
    
    try {
      const decoded = jwt.verify(token, jwtSecret);
      
      // Attach user info to request
      req.user = {
        id: decoded.userId,
        email: decoded.email
      };
      
      logger.debug('User authenticated', {
        requestId: req.id,
        userId: req.user.id
      });
      
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        const error = new Error('Token expired');
        error.statusCode = 401;
        error.code = 'TOKEN_EXPIRED';
        return next(error);
      }
      
      if (jwtError.name === 'JsonWebTokenError') {
        const error = new Error('Invalid token');
        error.statusCode = 401;
        error.code = 'INVALID_TOKEN';
        return next(error);
      }
      
      throw jwtError;
    }
  } catch (error) {
    logger.error('Authentication error', {
      requestId: req.id,
      error: error.message
    });
    
    error.statusCode = error.statusCode || 500;
    error.code = error.code || 'AUTHENTICATION_ERROR';
    next(error);
  }
}

module.exports = authenticate;
