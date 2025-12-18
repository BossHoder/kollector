const assetService = require('./assets.service');
const logger = require('../../config/logger');

/**
 * Asset Controller
 * Handles HTTP requests for assets
 */
class AssetController {
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
}

module.exports = new AssetController();
