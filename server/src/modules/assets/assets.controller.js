const assetService = require('./assets.service');
const gamificationService = require('../gamification/gamification.service');
const { getQueueMetrics } = require('./assets.queue');
const { getEnhancementQueueMetrics } = require('./assets.enhancement.queue');
const logger = require('../../config/logger');
const { getAssetCategoryOptions } = require('./categories.catalog');
const {
  buildAssetFilename,
  normalizeAnalyzeQueueCategory,
  normalizeOptionalText,
} = require('./upload.helpers');

const enhancementAckMetrics = {
  accepted: 0,
  conflicts: 0,
  failures: 0,
  lastAckDurationMs: 0,
  lastAcceptedAt: null,
};

/**
 * Asset Controller
 * Handles HTTP requests for assets
 */
class AssetController {
  /**
   * Submit asset for AI processing
   * POST /api/assets/analyze-queue
   */
  async analyzeQueue(req, res, next) {
    try {
      const userId = req.user.id;
      const category = normalizeAnalyzeQueueCategory(req.body.category);
      const assetName = normalizeOptionalText(req.body.assetName);
      const file = req.file;

      // Validate image file is present
      if (!file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Image file is required',
            details: [
              {
                field: 'image',
                message: 'Image file is required'
              }
            ]
          }
        });
      }

      // Validate category
      if (!category) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Category is required',
            details: [
              {
                field: 'category',
                message: 'Category is required'
              }
            ]
          }
        });
      }

      const originalFilename = buildAssetFilename(assetName, file.originalname, file.mimetype);

      // Create asset and enqueue job
      const result = await assetService.createAssetAndEnqueue(userId, {
        category,
        imageBuffer: file.buffer,
        imageMimetype: file.mimetype,
        originalFilename,
        fileSizeBytes: file.size,
      });

      logger.info('Asset submitted for AI processing', {
        requestId: req.id,
        assetId: result.assetId,
        jobId: result.jobId,
        userId
      });

      // Return 202 Accepted per OpenAPI spec
      res.status(202).json({
        success: true,
        data: {
          assetId: result.assetId,
          jobId: result.jobId,
          status: result.asset.status,
          message: 'Asset queued for AI analysis',
          asset: result.asset,
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new asset
   * POST /api/assets
   */
  async createAsset(req, res, next) {
    try {
      const userId = req.user.id;
      const assetData = req.body;

      const asset = await assetService.createAsset(userId, assetData);

      logger.info('Asset created via API', {
        requestId: req.id,
        assetId: asset._id,
        userId
      });

      res.status(201).json(asset);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List assets for current user
   * GET /api/assets?cursor=xxx&limit=20&category=sneaker&status=active
   */
  async listAssets(req, res, next) {
    try {
      const userId = req.user.id;
      const { cursor, limit, category, status } = req.query;

      const result = await assetService.listAssets(userId, {
        cursor,
        limit: limit ? parseInt(limit, 10) : 20,
        category,
        status
      });

      logger.info('Assets listed via API', {
        requestId: req.id,
        userId,
        count: result.items.length
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get asset by ID
   * GET /api/assets/:id
   */
  async getAssetById(req, res, next) {
    try {
      const userId = req.user.id;
      const assetId = req.params.id;

      const asset = await assetService.getAssetById(assetId, userId);

      logger.info('Asset retrieved via API', {
        requestId: req.id,
        assetId,
        userId
      });

      res.status(200).json(asset);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update asset
   * PATCH /api/assets/:id
   */
  async updateAsset(req, res, next) {
    try {
      const userId = req.user.id;
      const assetId = req.params.id;
      const updates = req.body;

      const asset = await assetService.updateAsset(assetId, userId, updates);

      logger.info('Asset updated via API', {
        requestId: req.id,
        assetId,
        userId
      });

      res.status(200).json(asset);
    } catch (error) {
      if (error.code === 'INVALID_THEME_PRESET') {
        return res.status(400).json({
          success: false,
          error: {
            code: error.code,
            field: error.field,
            message: error.message,
          },
        });
      }
      next(error);
    }
  }

  /**
   * Delete asset
   * DELETE /api/assets/:id
   */
  async deleteAsset(req, res, next) {
    try {
      const userId = req.user.id;
      const assetId = req.params.id;

      await assetService.deleteAsset(assetId, userId);

      logger.info('Asset deleted via API', {
        requestId: req.id,
        assetId,
        userId
      });

      res.status(204).json({
        message: 'Asset deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get queue status/metrics
   * GET /api/assets/queue-status
   */
  async getQueueStatus(req, res, next) {
    try {
      const [metrics, enhancementMetrics] = await Promise.all([
        getQueueMetrics(),
        getEnhancementQueueMetrics(),
      ]);

      logger.info('Queue status requested', {
        requestId: req.id,
        userId: req.user.id
      });

      res.status(200).json({
        success: true,
        data: {
          ...metrics,
          aiProcessing: metrics,
          assetEnhancement: enhancementMetrics,
          enhancementAck: {
            ...enhancementAckMetrics,
          },
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async getCategories(req, res, next) {
    try {
      res.status(200).json({
        success: true,
        data: getAssetCategoryOptions(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retry failed/partial asset analysis
   * POST /api/assets/:id/retry
   * 
   * Returns 202 on success, 409 if asset is not in retryable state
   */
  async retryAsset(req, res, next) {
    try {
      const userId = req.user.id;
      const assetId = req.params.id;

      const result = await assetService.retryAsset(assetId, userId);

      logger.info('Asset retry requested', {
        requestId: req.id,
        assetId,
        jobId: result.jobId,
        userId
      });

      // Return 202 Accepted per contract spec
      res.status(202).json({
        success: true,
        message: 'Asset analysis retry queued',
        asset: result.asset
      });
    } catch (error) {
      // Handle specific error types
      if (error.code === 'NOT_RETRYABLE') {
        return res.status(409).json({
          success: false,
          error: error.message || 'Asset cannot be retried in its current state'
        });
      }
      if (error.code === 'NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: error.message || 'Asset not found'
        });
      }
      next(error);
    }
  }

  async maintainAsset(req, res, next) {
    try {
      const result = await gamificationService.maintainAsset({
        assetId: req.params.assetId,
        userId: req.user.id,
        version: req.body.version,
        cleanedPercentage: req.body.cleanedPercentage,
        durationMs: req.body.durationMs,
      });

      logger.info('Asset maintenance request completed', {
        requestId: req.id,
        assetId: req.params.assetId,
        userId: req.user.id,
      });

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async queueEnhancement(req, res, next) {
    const startedAt = Date.now();

    try {
      const userId = req.user.id;
      const assetId = req.params.id;
      const result = await assetService.queueEnhancement(assetId, userId);

      enhancementAckMetrics.accepted += 1;
      enhancementAckMetrics.lastAckDurationMs = Date.now() - startedAt;
      enhancementAckMetrics.lastAcceptedAt = new Date().toISOString();

      logger.info('Asset enhancement accepted', {
        requestId: req.id,
        assetId,
        jobId: result.jobId,
        userId,
        ackDurationMs: enhancementAckMetrics.lastAckDurationMs,
      });

      res.status(202).json({
        success: true,
        data: {
          assetId: result.assetId,
          jobId: result.jobId,
          status: result.status,
        },
      });
    } catch (error) {
      if (error.code === 'ENHANCEMENT_ALREADY_ACTIVE') {
        enhancementAckMetrics.conflicts += 1;
        return res.status(409).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
      }

      if (error.code === 'NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
      }

      enhancementAckMetrics.failures += 1;
      next(error);
    }
  }

  getEnhancementAckMetrics() {
    return { ...enhancementAckMetrics };
  }
}

module.exports = new AssetController();
