// Load environment variables from .env.test if NODE_ENV is test, otherwise .env
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
require('dotenv').config({ path: envFile });
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const logger = require('./config/logger');
const { connectDatabase } = require('./config/database');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');
const { initSocket, closeSocket } = require('./config/socket');
const { closeQueue } = require('./modules/assets/assets.queue');
const { closeConnection: closeRedis } = require('./config/redis');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Request ID middleware (for logging and tracing)
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  next();
});

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser middleware
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes
const authRoutes = require('./modules/auth/auth.routes');
const assetRoutes = require('./modules/assets/assets.routes');
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Worker instance (initialized on server start)
let worker = null;

// Start server
async function startServer() {
  try {
    // Connect to database first
    await connectDatabase();
    
    // Initialize Socket.io
    initSocket(server);
    
    // Initialize AI worker (import here to avoid circular deps)
    const { startWorker } = require('./workers/ai.worker');
    worker = startWorker();
    
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info('Socket.io and AI worker initialized');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown handler
async function gracefulShutdown(signal) {
  logger.info(`${signal} received: starting graceful shutdown`);
  
  try {
    // Close worker first
    if (worker) {
      await worker.close();
      logger.info('AI worker closed');
    }
    
    // Close Socket.io connections
    await closeSocket();
    
    // Close queue
    await closeQueue();
    
    // Close Redis connection
    await closeRedis();
    
    // Close HTTP server
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    
    // Force exit if graceful shutdown takes too long
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error: error.message });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Only start server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { app, server };
