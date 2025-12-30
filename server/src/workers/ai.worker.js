/**
 * AI Processing Worker
 * BullMQ worker that processes jobs from the ai-processing queue
 * @module workers/ai.worker
 */

const { Worker } = require('bullmq');
const { getConnection } = require('../config/redis');
const { QUEUE_NAME } = require('../modules/assets/assets.queue');
const { callAnalyze } = require('../modules/assets/ai.client');
const { emitAssetProcessed, buildSuccessPayload, buildFailurePayload } = require('../modules/assets/assets.events');
const Asset = require('../models/Asset');
const logger = require('../config/logger');

/**
 * Worker concurrency (jobs processed simultaneously)
 */
const WORKER_CONCURRENCY = 5;

/**
 * Worker instance (singleton)
 * @type {Worker|null}
 */
let worker = null;

/**
 * Process a single AI job
 * @param {Job} job - BullMQ job
 * @returns {Promise<Object>} Processing result
 */
async function processJob(job) {
  const { assetId, userId, imageUrl, category } = job.data;
  const startTime = Date.now();
  
  logger.info('Processing AI job', {
    jobId: job.id,
    assetId,
    userId,
    category,
    attempt: job.attemptsMade + 1,
    maxAttempts: job.opts.attempts
  });

  // Fetch asset from database
  const asset = await Asset.findById(assetId);
  
  if (!asset) {
    // Asset was deleted while queued - complete job gracefully
    logger.warn('Asset not found, skipping processing', {
      jobId: job.id,
      assetId
    });
    return { skipped: true, reason: 'Asset not found' };
  }

  // Verify ownership hasn't changed
  if (asset.userId.toString() !== userId) {
    logger.warn('Asset ownership mismatch, skipping', {
      jobId: job.id,
      assetId,
      expectedUserId: userId,
      actualUserId: asset.userId.toString()
    });
    return { skipped: true, reason: 'Ownership mismatch' };
  }

  try {
    // Call AI service
    const aiResult = await callAnalyze(imageUrl, category);
    const duration = Date.now() - startTime;

    // Update asset with AI results
    asset.status = 'active';
    asset.aiMetadata = {
      brand: aiResult.brand,
      model: aiResult.model,
      colorway: aiResult.colorway,
      processedAt: new Date()
    };
    
    if (aiResult.processedImageUrl) {
      asset.images.processed = {
        url: aiResult.processedImageUrl,
        processedAt: new Date()
      };
    }

    await asset.save();

    logger.info('AI job completed successfully', {
      jobId: job.id,
      assetId,
      duration,
      brand: aiResult.brand?.value,
      model: aiResult.model?.value
    });

    // Emit success event
    const successPayload = buildSuccessPayload(
      assetId,
      asset.aiMetadata,
      aiResult.processedImageUrl
    );
    emitAssetProcessed(userId, successPayload);

    return {
      success: true,
      assetId,
      duration,
      aiMetadata: asset.aiMetadata
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('AI job processing error', {
      jobId: job.id,
      assetId,
      attempt: job.attemptsMade + 1,
      error: error.message,
      duration,
      retryable: error.retryable
    });

    // If retryable, throw to trigger BullMQ retry
    if (error.retryable) {
      throw error;
    }

    // Non-retryable error - mark as failed immediately
    const failureError = new Error(error.message);
    failureError.unrecoverable = true;
    throw failureError;
  }
}

/**
 * Handle job failure (after all retries exhausted)
 * @param {Job} job - Failed job
 * @param {Error} error - Failure error
 */
async function handleFailure(job, error) {
  const { assetId, userId } = job.data;
  
  logger.error('AI job failed permanently', {
    jobId: job.id,
    assetId,
    attempts: job.attemptsMade,
    error: error.message
  });

  try {
    // Update asset status to failed
    const asset = await Asset.findById(assetId);
    
    if (asset) {
      asset.status = 'failed';
      asset.aiMetadata = {
        ...asset.aiMetadata,
        error: error.message,
        failedAt: new Date()
      };
      await asset.save();

      // Emit failure event
      const failurePayload = buildFailurePayload(assetId, error.message);
      emitAssetProcessed(userId, failurePayload);
    }
  } catch (updateError) {
    logger.error('Failed to update asset on job failure', {
      jobId: job.id,
      assetId,
      error: updateError.message
    });
  }
}

/**
 * Start the AI processing worker
 * @returns {Worker} BullMQ Worker instance
 */
function startWorker() {
  if (worker) {
    return worker;
  }

  const connection = getConnection();

  worker = new Worker(
    QUEUE_NAME,
    processJob,
    {
      connection,
      concurrency: WORKER_CONCURRENCY,
      // Stalled job settings
      stalledInterval: 30000, // Check for stalled jobs every 30s
      maxStalledCount: 2 // Retry stalled jobs up to 2 times
    }
  );

  // Event handlers
  worker.on('completed', (job, result) => {
    logger.info('Job completed', {
      jobId: job.id,
      assetId: job.data.assetId,
      result: result?.success ? 'success' : 'skipped'
    });
  });

  worker.on('failed', (job, error) => {
    // Only handle permanent failures (all retries exhausted)
    if (job.attemptsMade >= job.opts.attempts) {
      handleFailure(job, error);
    }
  });

  worker.on('error', (error) => {
    logger.error('Worker error', { error: error.message });
  });

  worker.on('stalled', (jobId) => {
    logger.warn('Job stalled', { jobId });
  });

  logger.info('AI worker started', {
    queueName: QUEUE_NAME,
    concurrency: WORKER_CONCURRENCY
  });

  return worker;
}

/**
 * Get current worker instance
 * @returns {Worker|null}
 */
function getWorker() {
  return worker;
}

module.exports = {
  startWorker,
  getWorker,
  processJob,
  WORKER_CONCURRENCY
};
