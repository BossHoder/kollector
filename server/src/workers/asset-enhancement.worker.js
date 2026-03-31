const { Worker } = require('bullmq');
const { getConnection } = require('../config/redis');
const { extractPublicIdFromUrl } = require('../config/cloudinary');
const logger = require('../config/logger');
const Asset = require('../models/Asset');
const { callEnhanceImage } = require('../modules/assets/ai.client');
const {
  emitAssetImageEnhanced,
  buildEnhancementSuccessPayload,
  buildEnhancementFailurePayload,
} = require('../modules/assets/assets.enhancement.events');
const {
  ENHANCEMENT_MAX_ATTEMPTS,
  ENHANCEMENT_QUEUE_NAME,
  ENHANCEMENT_STATUS,
} = require('../modules/assets/enhancement.constants');

const WORKER_CONCURRENCY = 2;

let worker = null;

async function processEnhancementJob(job) {
  const { assetId, userId, originalImageUrl, requestedAt, options } = job.data;
  const attemptCount = Math.min((job.attemptsMade || 0) + 1, ENHANCEMENT_MAX_ATTEMPTS);
  const startTime = Date.now();

  logger.info('Processing enhancement job', {
    jobId: job.id,
    assetId,
    userId,
    attempt: attemptCount,
    maxAttempts: job.opts.attempts,
  });

  const asset = await Asset.findById(assetId);

  if (!asset) {
    logger.warn('Asset not found, skipping enhancement', {
      jobId: job.id,
      assetId,
    });
    return { skipped: true, reason: 'Asset not found' };
  }

  if (asset.userId.toString() !== userId) {
    logger.warn('Asset ownership mismatch, skipping enhancement', {
      jobId: job.id,
      assetId,
      expectedUserId: userId,
      actualUserId: asset.userId.toString(),
    });
    return { skipped: true, reason: 'Ownership mismatch' };
  }

  try {
    asset.enhancement = {
      ...(asset.enhancement?.toObject ? asset.enhancement.toObject() : asset.enhancement || {}),
      status: ENHANCEMENT_STATUS.PROCESSING,
      lastJobId: String(job.id),
      requestedBy: asset.enhancement?.requestedBy || userId,
      requestedAt: asset.enhancement?.requestedAt || new Date(requestedAt),
      completedAt: null,
      errorCode: null,
      errorMessage: null,
      attemptCount,
    };
    await asset.save();

    const enhancementResult = await callEnhanceImage({
      imageUrl: originalImageUrl,
      options,
      assetId,
      jobId: String(job.id),
    });

    if (!enhancementResult.enhancedImageUrl) {
      const missingOutputError = new Error('Enhancement service missing enhanced image URL');
      missingOutputError.retryable = true;
      throw missingOutputError;
    }

    asset.images.enhanced = {
      url: enhancementResult.enhancedImageUrl,
      publicId: extractPublicIdFromUrl(enhancementResult.enhancedImageUrl),
      width: enhancementResult.width || undefined,
      height: enhancementResult.height || undefined,
      generatedAt: new Date(),
    };
    asset.enhancement = {
      ...(asset.enhancement?.toObject ? asset.enhancement.toObject() : asset.enhancement || {}),
      status: ENHANCEMENT_STATUS.SUCCEEDED,
      lastJobId: String(job.id),
      requestedBy: asset.enhancement?.requestedBy || userId,
      requestedAt: asset.enhancement?.requestedAt || new Date(requestedAt),
      completedAt: new Date(),
      errorCode: null,
      errorMessage: null,
      attemptCount,
    };
    await asset.save();

    emitAssetImageEnhanced(
      userId,
      buildEnhancementSuccessPayload(
        assetId,
        enhancementResult.enhancedImageUrl,
        attemptCount
      )
    );

    return {
      success: true,
      assetId,
      duration: Date.now() - startTime,
      enhancedImageUrl: enhancementResult.enhancedImageUrl,
    };
  } catch (error) {
    logger.error('Enhancement job processing error', {
      jobId: job.id,
      assetId,
      attempt: attemptCount,
      error: error.message,
      retryable: error.retryable,
    });

    if (error.retryable) {
      throw error;
    }

    let discarded = false;
    if (typeof job.discard === 'function') {
      try {
        await job.discard();
        discarded = true;
      } catch (discardError) {
        logger.warn('Failed to discard non-retryable enhancement job', {
          jobId: job.id,
          error: discardError.message,
        });
      }
    }

    await handleEnhancementFailure(job, error);

    if (discarded) {
      error.handledFailure = true;
      throw error;
    }

    return {
      success: false,
      failed: true,
      retryable: false,
      assetId,
      error: error.message,
    };
  }
}

async function handleEnhancementFailure(job, error) {
  const { assetId, userId, requestedAt } = job.data;
  const attemptCount = Math.min(
    Math.max(job.attemptsMade || 0, 1),
    ENHANCEMENT_MAX_ATTEMPTS
  );

  try {
    const asset = await Asset.findById(assetId);

    if (!asset) {
      return;
    }

    asset.enhancement = {
      ...(asset.enhancement?.toObject ? asset.enhancement.toObject() : asset.enhancement || {}),
      status: ENHANCEMENT_STATUS.FAILED,
      lastJobId: String(job.id),
      requestedBy: asset.enhancement?.requestedBy || userId,
      requestedAt: asset.enhancement?.requestedAt || new Date(requestedAt),
      completedAt: new Date(),
      errorCode: error.code || 'ENHANCEMENT_FAILED',
      errorMessage: error.message,
      attemptCount,
    };
    await asset.save();

    emitAssetImageEnhanced(
      userId,
      buildEnhancementFailurePayload(assetId, error.message, attemptCount)
    );
  } catch (updateError) {
    logger.error('Failed to update asset on enhancement failure', {
      jobId: job.id,
      assetId,
      error: updateError.message,
    });
  }
}

function startEnhancementWorker() {
  if (worker) {
    return worker;
  }

  worker = new Worker(
    ENHANCEMENT_QUEUE_NAME,
    processEnhancementJob,
    {
      connection: getConnection(),
      concurrency: WORKER_CONCURRENCY,
      stalledInterval: 30000,
      maxStalledCount: 2,
    }
  );

  worker.on('completed', (job, result) => {
    logger.info('Enhancement job completed', {
      jobId: job.id,
      assetId: job.data.assetId,
      result: result?.success ? 'success' : 'skipped',
    });
  });

  worker.on('failed', (job, error) => {
    if (error?.handledFailure) {
      return;
    }

    if (job && job.attemptsMade >= job.opts.attempts) {
      handleEnhancementFailure(job, error);
    }
  });

  worker.on('error', (error) => {
    logger.error('Asset enhancement worker error', { error: error.message });
  });

  worker.on('stalled', (jobId) => {
    logger.warn('Enhancement job stalled', { jobId });
  });

  logger.info('Asset enhancement worker started', {
    queueName: ENHANCEMENT_QUEUE_NAME,
    concurrency: WORKER_CONCURRENCY,
  });

  return worker;
}

function getEnhancementWorker() {
  return worker;
}

module.exports = {
  WORKER_CONCURRENCY,
  getEnhancementWorker,
  handleEnhancementFailure,
  processEnhancementJob,
  startEnhancementWorker,
};
