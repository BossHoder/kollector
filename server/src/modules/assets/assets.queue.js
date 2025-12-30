/**
 * BullMQ Queue Setup for AI Processing
 * Manages the ai-processing queue and job submission
 * @module modules/assets/assets.queue
 */

const { Queue } = require('bullmq');
const { getConnection } = require('../../config/redis');
const logger = require('../../config/logger');

/**
 * Queue name for AI processing jobs
 */
const QUEUE_NAME = 'ai-processing';

/**
 * Default job options per research.md specification
 * - 3 retry attempts with exponential backoff (2s, 4s, 8s)
 * - Job timeout of 120 seconds
 * - Remove completed jobs after 24 hours
 * - Remove failed jobs after 7 days
 */
const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000
  },
  timeout: 120000, // 2 minutes
  removeOnComplete: {
    age: 24 * 3600 // 24 hours in seconds
  },
  removeOnFail: {
    age: 7 * 24 * 3600 // 7 days in seconds
  }
};

/**
 * Queue instance (singleton)
 * @type {Queue|null}
 */
let queue = null;

/**
 * Get or create the AI processing queue
 * @returns {Queue} BullMQ Queue instance
 */
function getQueue() {
  if (!queue) {
    const connection = getConnection();
    queue = new Queue(QUEUE_NAME, { connection });
    
    logger.info('AI processing queue initialized', { queueName: QUEUE_NAME });
  }
  return queue;
}

/**
 * Add a job to the AI processing queue
 * Job data must conform to ai-job.schema.json
 * @param {Object} jobData - Job payload
 * @param {string} jobData.assetId - MongoDB ObjectId of the asset
 * @param {string} jobData.userId - MongoDB ObjectId of the owner
 * @param {string} jobData.imageUrl - Cloudinary URL of original image
 * @param {string} jobData.category - Asset category (sneaker, lego, camera, other)
 * @param {string} jobData.createdAt - ISO timestamp
 * @returns {Promise<string>} Job ID
 */
async function addToProcessingQueue(jobData) {
  const q = getQueue();
  
  // Validate required fields per ai-job.schema.json
  const requiredFields = ['assetId', 'userId', 'imageUrl', 'category', 'createdAt'];
  for (const field of requiredFields) {
    if (!jobData[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Create job with only the required fields (no extra fields per schema)
  const sanitizedData = {
    assetId: String(jobData.assetId),
    userId: String(jobData.userId),
    imageUrl: jobData.imageUrl,
    category: jobData.category,
    createdAt: jobData.createdAt
  };

  const job = await q.add('process-asset', sanitizedData, DEFAULT_JOB_OPTIONS);
  
  logger.info('Job added to AI processing queue', {
    jobId: job.id,
    assetId: sanitizedData.assetId,
    userId: sanitizedData.userId,
    category: sanitizedData.category
  });

  return job.id;
}

/**
 * Get queue metrics for monitoring
 * @returns {Promise<Object>} Job counts by state
 */
async function getQueueMetrics() {
  const q = getQueue();
  const counts = await q.getJobCounts(
    'waiting',
    'active',
    'completed',
    'failed',
    'delayed',
    'paused'
  );
  
  return {
    waiting: counts.waiting || 0,
    active: counts.active || 0,
    completed: counts.completed || 0,
    failed: counts.failed || 0,
    delayed: counts.delayed || 0,
    paused: counts.paused || 0
  };
}

/**
 * Close queue gracefully
 * @returns {Promise<void>}
 */
async function closeQueue() {
  if (queue) {
    await queue.close();
    queue = null;
    logger.info('AI processing queue closed gracefully');
  }
}

module.exports = {
  QUEUE_NAME,
  DEFAULT_JOB_OPTIONS,
  getQueue,
  addToProcessingQueue,
  getQueueMetrics,
  closeQueue
};
