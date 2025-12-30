/**
 * Redis Connection Configuration
 * Provides ioredis connection for BullMQ queue operations
 * @module config/redis
 */

const Redis = require('ioredis');
const logger = require('./logger');

/**
 * Redis connection instance
 * @type {Redis|null}
 */
let connection = null;

/**
 * Create Redis connection for BullMQ
 * BullMQ requires maxRetriesPerRequest: null for proper operation
 * @returns {Redis} Redis connection instance
 */
function createConnection() {
  if (connection) {
    return connection;
  }

  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is required');
  }

  connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      logger.warn('Redis connection retry', { attempt: times, delay });
      return delay;
    }
  });

  connection.on('connect', () => {
    logger.info('Redis connected');
  });

  connection.on('error', (err) => {
    logger.error('Redis connection error', { error: err.message });
  });

  connection.on('close', () => {
    logger.warn('Redis connection closed');
  });

  return connection;
}

/**
 * Get existing Redis connection or create new one
 * @returns {Redis} Redis connection instance
 */
function getConnection() {
  if (!connection) {
    return createConnection();
  }
  return connection;
}

/**
 * Close Redis connection gracefully
 * @returns {Promise<void>}
 */
async function closeConnection() {
  if (connection) {
    await connection.quit();
    connection = null;
    logger.info('Redis connection closed gracefully');
  }
}

module.exports = {
  createConnection,
  getConnection,
  closeConnection
};
