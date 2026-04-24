const { Queue } = require('bullmq');
const { getConnection } = require('../../config/redis');
const logger = require('../../config/logger');
const {
  DEFAULT_ENHANCEMENT_OPTIONS,
  ENHANCEMENT_JOB_NAME,
  ENHANCEMENT_JOB_TYPE,
  ENHANCEMENT_MAX_ATTEMPTS,
  ENHANCEMENT_QUEUE_NAME,
} = require('./enhancement.constants');

const DEFAULT_ENHANCEMENT_JOB_OPTIONS = {
  attempts: ENHANCEMENT_MAX_ATTEMPTS,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  timeout: 120000,
  removeOnComplete: {
    age: 24 * 3600,
  },
  removeOnFail: {
    age: 7 * 24 * 3600,
  },
};

let enhancementQueue = null;

function getEnhancementQueue() {
  if (!enhancementQueue) {
    enhancementQueue = new Queue(ENHANCEMENT_QUEUE_NAME, {
      connection: getConnection(),
    });

    logger.info('Asset enhancement queue initialized', {
      queueName: ENHANCEMENT_QUEUE_NAME,
    });
  }

  return enhancementQueue;
}

function sanitizeEnhancementJobData(jobData) {
  const requiredFields = ['assetId', 'userId', 'originalImageUrl', 'requestedAt'];

  for (const field of requiredFields) {
    if (!jobData[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  return {
    jobType: ENHANCEMENT_JOB_TYPE,
    queue: ENHANCEMENT_QUEUE_NAME,
    assetId: String(jobData.assetId),
    userId: String(jobData.userId),
    originalImageUrl: String(jobData.originalImageUrl),
    requestedAt: jobData.requestedAt,
    quotaActionType: jobData.quotaActionType || null,
    quotaIdempotencyKey: jobData.quotaIdempotencyKey || null,
    attempt:
      typeof jobData.attempt === 'number' && jobData.attempt > 0
        ? jobData.attempt
        : 1,
    options: jobData.options || DEFAULT_ENHANCEMENT_OPTIONS,
  };
}

async function addToEnhancementQueue(jobData) {
  const queue = getEnhancementQueue();
  const payload = sanitizeEnhancementJobData(jobData);
  const job = await queue.add(
    ENHANCEMENT_JOB_NAME,
    payload,
    DEFAULT_ENHANCEMENT_JOB_OPTIONS
  );

  logger.info('Job added to asset enhancement queue', {
    jobId: job.id,
    assetId: payload.assetId,
    userId: payload.userId,
  });

  return String(job.id);
}

async function getEnhancementQueueMetrics() {
  const queue = getEnhancementQueue();
  const counts = await queue.getJobCounts(
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
    paused: counts.paused || 0,
  };
}

async function closeEnhancementQueue() {
  if (enhancementQueue) {
    await enhancementQueue.close();
    enhancementQueue = null;
    logger.info('Asset enhancement queue closed gracefully');
  }
}

module.exports = {
  DEFAULT_ENHANCEMENT_JOB_OPTIONS,
  addToEnhancementQueue,
  closeEnhancementQueue,
  getEnhancementQueue,
  getEnhancementQueueMetrics,
  sanitizeEnhancementJobData,
};
