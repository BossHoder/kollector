const Asset = require('../../models/Asset');
const logger = require('../../config/logger');
const { uploadImage } = require('../../config/cloudinary');
const { addToProcessingQueue } = require('./assets.queue');

/**
 * Asset Service
 * Handles asset business logic
 */
class AssetService {
  /**
   * Upload image to Cloudinary
   * @param {Buffer} buffer - Image buffer
   * @param {Object} options - Upload options
   * @returns {Promise<{url: string, publicId: string}>}
   */
  async uploadToCloudinary(buffer, options = {}) {
    const result = await uploadImage(buffer, {
      folder: options.folder || 'assets/originals',
      ...options
    });
    return result;
  }

  /**
   * Create asset and enqueue for AI processing
   * @param {string} userId - User ID
   * @param {Object} data - Asset data
   * @param {string} data.category - Asset category
   * @param {Buffer} data.imageBuffer - Image buffer
   * @param {string} data.imageMimetype - Image MIME type
   * @param {string} data.originalFilename - Original filename
   * @returns {Promise<{assetId: string, jobId: string}>}
   */
  async createAssetAndEnqueue(userId, data) {
    const { category, imageBuffer, originalFilename } = data;

    // Upload image to Cloudinary first
    const uploadResult = await this.uploadToCloudinary(imageBuffer, {
      folder: 'assets/originals'
    });

    // Create asset with status = 'processing'
    const asset = await Asset.create({
      userId,
      category,
      status: 'processing',
      condition: {
        health: 100,
        decayRate: 2
      },
      visualLayers: [],
      images: {
        original: {
          url: uploadResult.url,
          publicId: uploadResult.publicId,
          uploadedAt: new Date()
        }
      },
      aiMetadata: {},
      nfc: {},
      marketData: {}
    });

    // Enqueue AI processing job
    const createdAt = new Date().toISOString();
    const jobId = await addToProcessingQueue({
      assetId: asset._id.toString(),
      userId: userId.toString(),
      imageUrl: uploadResult.url,
      category,
      createdAt
    });

    // Update asset with processing job ID
    asset.processingJobId = jobId;
    await asset.save();

    logger.info('Asset created and enqueued for processing', {
      assetId: asset._id,
      jobId,
      userId,
      category,
      imageUrl: uploadResult.url
    });

    return {
      assetId: asset._id.toString(),
      jobId
    };
  }

  /**
   * Create a new asset
   * @param {string} userId
   * @param {object} assetData
   * @returns {Promise<object>}
   */
  async createAsset(userId, assetData) {
    try {
      const { category, status = 'draft' } = assetData;

      const asset = await Asset.create({
        userId,
        category,
        status,
        condition: {
          health: 100,
          decayRate: 2
        },
        visualLayers: [],
        images: {
          original: {
            url: 'https://placeholder.com/asset-image.jpg', // Placeholder until actual image is uploaded
            uploadedAt: new Date()
          }
        },
        aiMetadata: {},
        nfc: {},
        marketData: {}
      });

      logger.info('Asset created', {
        assetId: asset._id,
        userId,
        category
      });

      return asset;
    } catch (error) {
      logger.error('Error creating asset', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * List assets for a user with cursor-based pagination
   * @param {string} userId
   * @param {object} options - { cursor, limit, category, status }
   * @returns {Promise<{items: Array, nextCursor: string|null}>}
   */
  async listAssets(userId, options = {}) {
    try {
      const { cursor, limit = 20, category, status } = options;
      const maxLimit = Math.min(limit, 100);

      // Build query
      const query = { userId };
      
      if (category) {
        query.category = category;
      }
      
      if (status) {
        query.status = status;
      }

      // Decode cursor if provided
      if (cursor) {
        const decodedCursor = this.decodeCursor(cursor);
        query.$or = [
          { createdAt: { $lt: decodedCursor.createdAt } },
          { 
            createdAt: decodedCursor.createdAt,
            _id: { $lt: decodedCursor._id }
          }
        ];
      }

      // Fetch items + 1 to check if there are more
      const items = await Asset.find(query)
        .sort({ createdAt: -1, _id: -1 })
        .limit(maxLimit + 1)
        .lean();

      // Check if there are more items
      const hasMore = items.length > maxLimit;
      const assets = hasMore ? items.slice(0, maxLimit) : items;

      // Generate next cursor if there are more items
      let nextCursor = null;
      if (hasMore) {
        const lastItem = assets[assets.length - 1];
        nextCursor = this.encodeCursor({
          createdAt: lastItem.createdAt,
          _id: lastItem._id
        });
      }

      logger.debug('Assets listed', {
        userId,
        count: assets.length,
        hasMore
      });

      return {
        items: assets,
        nextCursor
      };
    } catch (error) {
      logger.error('Error listing assets', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get asset by ID (with ownership check)
   * @param {string} assetId
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async getAssetById(assetId, userId) {
    try {
      const asset = await Asset.findOne({
        _id: assetId,
        userId
      }).lean();

      if (!asset) {
        const error = new Error('Asset not found');
        error.statusCode = 404;
        error.code = 'NOT_FOUND';
        throw error;
      }

      logger.debug('Asset retrieved', { assetId, userId });

      return asset;
    } catch (error) {
      if (error.statusCode === 404) {
        throw error;
      }
      logger.error('Error getting asset', { error: error.message, assetId, userId });
      throw error;
    }
  }

  /**
   * Update asset
   * @param {string} assetId
   * @param {string} userId
   * @param {object} updates
   * @returns {Promise<object>}
   */
  async updateAsset(assetId, userId, updates) {
    try {
      // Only allow updating certain fields
      const allowedUpdates = ['category', 'status'];
      const filteredUpdates = {};
      
      for (const key of allowedUpdates) {
        if (updates[key] !== undefined) {
          filteredUpdates[key] = updates[key];
        }
      }

      const asset = await Asset.findOneAndUpdate(
        { _id: assetId, userId },
        { $set: filteredUpdates },
        { new: true, runValidators: true }
      );

      if (!asset) {
        const error = new Error('Asset not found');
        error.statusCode = 404;
        error.code = 'NOT_FOUND';
        throw error;
      }

      logger.info('Asset updated', { assetId, userId, updates: filteredUpdates });

      return asset;
    } catch (error) {
      if (error.statusCode === 404) {
        throw error;
      }
      logger.error('Error updating asset', { error: error.message, assetId, userId });
      throw error;
    }
  }

  /**
   * Delete asset
   * @param {string} assetId
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async deleteAsset(assetId, userId) {
    try {
      const result = await Asset.deleteOne({
        _id: assetId,
        userId
      });

      if (result.deletedCount === 0) {
        const error = new Error('Asset not found');
        error.statusCode = 404;
        error.code = 'NOT_FOUND';
        throw error;
      }

      logger.info('Asset deleted', { assetId, userId });
    } catch (error) {
      if (error.statusCode === 404) {
        throw error;
      }
      logger.error('Error deleting asset', { error: error.message, assetId, userId });
      throw error;
    }
  }

  /**
   * Encode cursor for pagination
   * @param {object} data
   * @returns {string}
   */
  encodeCursor(data) {
    const cursorData = {
      createdAt: data.createdAt.toISOString(),
      _id: data._id.toString()
    };
    return Buffer.from(JSON.stringify(cursorData)).toString('base64');
  }

  /**
   * Decode cursor for pagination
   * @param {string} cursor
   * @returns {object}
   */
  decodeCursor(cursor) {
    try {
      const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
      return {
        createdAt: new Date(decoded.createdAt),
        _id: decoded._id
      };
    } catch (error) {
      const err = new Error('Invalid cursor');
      err.statusCode = 400;
      err.code = 'INVALID_CURSOR';
      throw err;
    }
  }
}

module.exports = new AssetService();
