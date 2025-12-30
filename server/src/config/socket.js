/**
 * Socket.io Server Configuration
 * Handles real-time event delivery with JWT authentication
 * @module config/socket
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('./logger');

/**
 * Socket.io server instance (singleton)
 * @type {Server|null}
 */
let io = null;

/**
 * Initialize Socket.io server with JWT authentication
 * @param {http.Server} httpServer - HTTP server instance
 * @returns {Server} Socket.io server instance
 */
function initSocket(httpServer) {
  if (io) {
    return io;
  }

  // Get CORS origin from environment
  const corsOrigin = process.env.SOCKET_CORS_ORIGIN || 
                     process.env.CLIENT_URL || 
                     '*';

  io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      credentials: true
    }
  });

  // JWT Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      logger.warn('Socket connection rejected: no token', {
        socketId: socket.id
      });
      return next(new Error('Authentication required'));
    }

    const jwtSecret = process.env.JWT_ACCESS_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_ACCESS_SECRET not configured');
      return next(new Error('Server configuration error'));
    }

    try {
      const decoded = jwt.verify(token, jwtSecret);
      
      // Attach userId to socket for room management
      // JWT uses 'userId' field based on existing auth.middleware.js
      socket.userId = decoded.userId;
      
      logger.debug('Socket authenticated', {
        socketId: socket.id,
        userId: socket.userId
      });
      
      next();
    } catch (err) {
      logger.warn('Socket connection rejected: invalid token', {
        socketId: socket.id,
        error: err.message
      });
      
      if (err.name === 'TokenExpiredError') {
        return next(new Error('Token expired'));
      }
      
      return next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    // Join user-specific room for targeted event delivery
    const userRoom = `user:${socket.userId}`;
    socket.join(userRoom);
    
    logger.info('Socket connected and joined room', {
      socketId: socket.id,
      userId: socket.userId,
      room: userRoom
    });

    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected', {
        socketId: socket.id,
        userId: socket.userId,
        reason
      });
    });

    socket.on('error', (err) => {
      logger.error('Socket error', {
        socketId: socket.id,
        userId: socket.userId,
        error: err.message
      });
    });
  });

  logger.info('Socket.io server initialized', { corsOrigin });
  
  return io;
}

/**
 * Get Socket.io server instance
 * Used by workers/services to emit events
 * @returns {Server|null} Socket.io server instance
 */
function getIO() {
  if (!io) {
    logger.warn('Socket.io not initialized - getIO() called before initSocket()');
  }
  return io;
}

/**
 * Close Socket.io server gracefully
 * @returns {Promise<void>}
 */
async function closeSocket() {
  if (io) {
    await new Promise((resolve) => {
      io.close(() => {
        logger.info('Socket.io server closed gracefully');
        resolve();
      });
    });
    io = null;
  }
}

module.exports = {
  initSocket,
  getIO,
  closeSocket
};
