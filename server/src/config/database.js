const mongoose = require('mongoose');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * Connect to MongoDB using Mongoose
 * @returns {Promise<void>}
 */
async function connectDatabase() {
  try {
    // Check if already connected (readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting)
    if (mongoose.connection.readyState === 1) {
      logger.info('MongoDB already connected');
      return;
    }
    
    // If connecting or disconnecting, wait for it to finish
    if (mongoose.connection.readyState === 2 || mongoose.connection.readyState === 3) {
      await new Promise((resolve) => {
        mongoose.connection.once('connected', resolve);
        mongoose.connection.once('disconnected', resolve);
      });
      // Recursively try again
      return connectDatabase();
    }
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/klectr';
    
    await mongoose.connect(mongoUri, {
      // Mongoose 9+ doesn't need useNewUrlParser, useUnifiedTopology
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });
    
    logger.info(`MongoDB connected: ${mongoose.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });
    
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

/**
 * Disconnect from MongoDB
 * @returns {Promise<void>}
 */
async function disconnectDatabase() {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error);
    throw error;
  }
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
  mongoose
};
