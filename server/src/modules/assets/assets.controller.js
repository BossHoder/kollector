const assetService = require('./assets.service');
const { getQueueMetrics } = require('./assets.queue');
const logger = require('../../config/logger');
const { getAssetCategoryOptions } = require('./categories.catalog');
const {
  ANALYZE_QUEUE_CATEGORIES,
  buildAssetFilename,
  normalizeAnalyzeQueueCategory,
  normalizeOptionalText,
} = require('./upload.helpers');

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
        const rawCategory = String(req.body.category ?? '').trim();
        const isMissingCategory = rawCategory.length === 0;

        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: isMissingCategory ? 'Category is required' : 'Invalid category',
            details: [
              {
                field: 'category',
                message: isMissingCategory
                  ? 'Category is required'
                  : `Must be one of: ${ANALYZE_QUEUE_CATEGORIES.join(', ')}`
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

      res.status(200).json({
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
      const metrics = await getQueueMetrics();

      logger.info('Queue status requested', {
        requestId: req.id,
        userId: req.user.id
      });

      res.status(200).json({
        success: true,
        data: metrics
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
}

module.exports = new AssetController();
