const Asset = require('../../models/Asset');
const User = require('../../models/User');
const logger = require('../../config/logger');
const {
  uploadImage,
  deleteImage,
  extractPublicIdFromUrl,
} = require('../../config/cloudinary');
const { addToEnhancementQueue } = require('./assets.enhancement.queue');
const { serializeAsset } = require('./asset.serializer');
const {
  ENHANCEMENT_ACTIVE_STATUSES,
  ENHANCEMENT_STATUS,
} = require('./enhancement.constants');
const { assertValidAssetThemePresetId } = require('./theme-presets.catalog');
const subscriptionService = require('../subscription/subscription.service');

function buildError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

class AssetService {
  async uploadAssetImage(buffer, options = {}) {
    return uploadImage(buffer, {
      folder: options.folder || 'assets/originals',
      ...options,
    });
  }

  async getUserDefaultThemeId(userId) {
    if (!userId) {
      return null;
    }

    const user = await User.findById(userId).lean();
    return user?.settings?.preferences?.assetTheme?.defaultThemeId || null;
  }

  async serializeForUser(asset, userId) {
    const userDefaultThemeId = await this.getUserDefaultThemeId(userId);
    return serializeAsset(asset, { userDefaultThemeId });
  }

  async enqueueEnhancementWorkflow(asset, userId, options = {}) {
    const originalImageUrl = asset.images?.original?.url;

    if (!originalImageUrl) {
      throw buildError(
        'TÃ i sáº£n khÃ´ng cÃ³ áº£nh gá»‘c Ä‘á»ƒ tÄƒng cÆ°á»ng',
        409,
        'ENHANCEMENT_NOT_AVAILABLE'
      );
    }

    const requestedAt = new Date().toISOString();
    const jobId = await addToEnhancementQueue({
      assetId: asset._id.toString(),
      userId: userId.toString(),
      originalImageUrl,
      requestedAt,
      attempt: 1,
      quotaActionType: options.quotaActionType || null,
      quotaIdempotencyKey: options.quotaIdempotencyKey || null,
    });

    asset.status = 'processing';
    asset.set('aiMetadata.error', null);
    asset.set('aiMetadata.failedAt', null);
    asset.processingJobId = undefined;
    asset.enhancement = {
      ...(asset.enhancement?.toObject ? asset.enhancement.toObject() : asset.enhancement || {}),
      status: ENHANCEMENT_STATUS.QUEUED,
      lastJobId: jobId,
      requestedBy: userId,
      requestedAt: new Date(requestedAt),
      completedAt: null,
      errorCode: null,
      errorMessage: null,
      attemptCount: 0,
    };
    await asset.save();

    return {
      jobId,
      requestedAt,
    };
  }

  async createAssetAndEnqueue(userId, data) {
    const {
      category,
      imageBuffer,
      originalFilename,
      imageMimetype,
      fileSizeBytes,
      quotaActionType,
      quotaIdempotencyKey,
    } = data;

    const uploadResult = await this.uploadAssetImage(imageBuffer, {
      folder: 'assets/originals',
    });

    const asset = await Asset.create({
      userId,
      category,
      status: 'processing',
      originalFilename: originalFilename || null,
      mimeType: imageMimetype || null,
      fileSizeBytes: fileSizeBytes || null,
      condition: {
        health: 100,
        decayRate: 2,
      },
      visualLayers: [],
      images: {
        original: {
          url: uploadResult.url,
          publicId: uploadResult.publicId,
          uploadedAt: new Date(),
        },
      },
      presentation: {
        themeOverrideId: null,
      },
      enhancement: {
        status: ENHANCEMENT_STATUS.IDLE,
        attemptCount: 0,
      },
      aiMetadata: {},
      nfc: {},
      marketData: {},
    });

    const { jobId } = await this.enqueueEnhancementWorkflow(asset, userId, {
      quotaActionType,
      quotaIdempotencyKey,
    });

    logger.info('Asset created from upload flow', {
      assetId: asset._id,
      jobId,
      userId,
      category,
      imageUrl: uploadResult.url,
    });

    return {
      assetId: asset._id.toString(),
      jobId,
      asset: await this.serializeForUser(asset, userId),
    };
  }

  async createAsset(userId, assetData) {
    try {
      const { category, status = 'draft' } = assetData;

      const asset = await Asset.create({
        userId,
        category,
        status,
        condition: {
          health: 100,
          decayRate: 2,
        },
        visualLayers: [],
        images: {
          original: {
            url: 'https://placeholder.com/asset-image.jpg',
            uploadedAt: new Date(),
          },
        },
        presentation: {
          themeOverrideId: null,
        },
        enhancement: {
          status: ENHANCEMENT_STATUS.IDLE,
          attemptCount: 0,
        },
        aiMetadata: {},
        nfc: {},
        marketData: {},
      });

      logger.info('Asset created', {
        assetId: asset._id,
        userId,
        category,
      });

      return this.serializeForUser(asset, userId);
    } catch (error) {
      logger.error('Error creating asset', { error: error.message, userId });
      throw error;
    }
  }

  async listAssets(userId, options = {}) {
    try {
      const { cursor, limit = 20, category, status } = options;
      const maxLimit = Math.min(limit, 100);
      const query = { userId };

      if (category) {
        const escapedCategory = String(category).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.category = new RegExp(`^${escapedCategory}$`, 'i');
      }

      if (status) {
        query.status = status;
      }

      if (cursor) {
        const decodedCursor = this.decodeCursor(cursor);
        query.$or = [
          { createdAt: { $lt: decodedCursor.createdAt } },
          {
            createdAt: decodedCursor.createdAt,
            _id: { $lt: decodedCursor._id },
          },
        ];
      }

      const items = await Asset.find(query)
        .sort({ createdAt: -1, _id: -1 })
        .limit(maxLimit + 1)
        .lean();

      const hasMore = items.length > maxLimit;
      const assets = hasMore ? items.slice(0, maxLimit) : items;
      const userDefaultThemeId = await this.getUserDefaultThemeId(userId);

      let nextCursor = null;
      if (hasMore) {
        const lastItem = assets[assets.length - 1];
        nextCursor = this.encodeCursor({
          createdAt: lastItem.createdAt,
          _id: lastItem._id,
        });
      }

      logger.debug('Assets listed', {
        userId,
        count: assets.length,
        hasMore,
      });

      return {
        items: assets.map((asset) => serializeAsset(asset, { userDefaultThemeId })),
        nextCursor,
      };
    } catch (error) {
      logger.error('Error listing assets', { error: error.message, userId });
      throw error;
    }
  }

  async getAssetById(assetId, userId) {
    try {
      const asset = await Asset.findOne({
        _id: assetId,
        userId,
      }).lean();

      if (!asset) {
        throw buildError('KhÃ´ng tÃ¬m tháº¥y tÃ i sáº£n', 404, 'NOT_FOUND');
      }

      logger.debug('Asset retrieved', { assetId, userId });
      return this.serializeForUser(asset, userId);
    } catch (error) {
      if (error.statusCode === 404) {
        throw error;
      }

      logger.error('Error getting asset', { error: error.message, assetId, userId });
      throw error;
    }
  }

  async updateAsset(assetId, userId, updates) {
    try {
      const asset = await Asset.findOne({ _id: assetId, userId });

      if (!asset) {
        throw buildError('KhÃ´ng tÃ¬m tháº¥y tÃ i sáº£n', 404, 'NOT_FOUND');
      }

      if (updates.category !== undefined) {
        asset.category = updates.category;
      }

      if (updates.status !== undefined) {
        asset.status = updates.status;
      }

      if (updates.presentation && Object.prototype.hasOwnProperty.call(updates.presentation, 'themeOverrideId')) {
        const themeOverrideId = assertValidAssetThemePresetId(
          updates.presentation.themeOverrideId,
          'presentation.themeOverrideId'
        );

        if (themeOverrideId !== asset.presentation?.themeOverrideId) {
          await subscriptionService.assertThemeSelectionAllowed(userId, themeOverrideId);
        }

        asset.presentation = {
          ...(asset.presentation?.toObject ? asset.presentation.toObject() : asset.presentation || {}),
          themeOverrideId,
        };
      }

      await asset.save();

      logger.info('Asset updated', { assetId, userId });

      return this.serializeForUser(asset, userId);
    } catch (error) {
      if (
        error.statusCode === 404
        || error.code === 'INVALID_THEME_PRESET'
        || error.code === 'THEME_TIER_LOCKED'
      ) {
        throw error;
      }

      logger.error('Error updating asset', { error: error.message, assetId, userId });
      throw error;
    }
  }

  async deleteAsset(assetId, userId) {
    try {
      const asset = await Asset.findOne({
        _id: assetId,
        userId,
      });

      if (!asset) {
        throw buildError('KhÃ´ng tÃ¬m tháº¥y tÃ i sáº£n', 404, 'NOT_FOUND');
      }

      const publicIdsToDelete = [
        asset.images?.original?.publicId,
        asset.images?.processed?.publicId,
        asset.images?.enhanced?.publicId,
        asset.images?.thumbnail?.publicId,
        extractPublicIdFromUrl(asset.images?.processed?.url),
        extractPublicIdFromUrl(asset.images?.enhanced?.url),
      ].filter(Boolean);

      await Asset.deleteOne({
        _id: assetId,
        userId,
      });

      for (const publicId of new Set(publicIdsToDelete)) {
        try {
          await deleteImage(publicId);
        } catch (cleanupError) {
          logger.warn('Asset file cleanup failed', {
            assetId,
            publicId,
            error: cleanupError.message,
          });
        }
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

  async retryAsset(assetId, userId) {
    const asset = await Asset.findOne({ _id: assetId, userId });

    if (!asset) {
      throw buildError('KhÃ´ng tÃ¬m tháº¥y tÃ i sáº£n', 404, 'NOT_FOUND');
    }

    const retryableStatuses = ['failed', 'partial'];
    if (!retryableStatuses.includes(asset.status)) {
      throw buildError(
        `Cannot retry asset. Current status: ${asset.status}. Only failed or partial assets are retryable.`,
        409,
        'NOT_RETRYABLE'
      );
    }

    if (!asset.images?.original?.url) {
      throw buildError('TÃ i sáº£n khÃ´ng cÃ³ áº£nh gá»‘c Ä‘á»ƒ xá»­ lÃ½', 409, 'NOT_RETRYABLE');
    }

    const previousStatus = asset.status;
    const { jobId } = await this.enqueueEnhancementWorkflow(asset, userId);

    logger.info('Asset retry enqueued', {
      assetId: asset._id,
      jobId,
      userId,
      previousStatus,
      category: asset.category,
    });

    return {
      asset: await this.serializeForUser(asset, userId),
      jobId,
    };
  }

  async queueEnhancement(assetId, userId, options = {}) {
    const asset = await Asset.findOne({ _id: assetId, userId });

    if (!asset) {
      throw buildError('KhÃ´ng tÃ¬m tháº¥y tÃ i sáº£n', 404, 'NOT_FOUND');
    }

    const enhancementStatus = asset.enhancement?.status || ENHANCEMENT_STATUS.IDLE;
    if (asset.status === 'processing' || ENHANCEMENT_ACTIVE_STATUSES.includes(enhancementStatus)) {
      throw buildError(
        'YÃªu cáº§u tÄƒng cÆ°á»ng áº£nh Ä‘Ã£ Ä‘Æ°á»£c xáº¿p hÃ ng hoáº·c Ä‘ang xá»­ lÃ½',
        409,
        'ENHANCEMENT_ALREADY_ACTIVE'
      );
    }

    const { jobId } = await this.enqueueEnhancementWorkflow(asset, userId, options);

    logger.info('Asset enhancement queued', {
      assetId: asset._id,
      jobId,
      userId,
    });

    return {
      assetId: asset._id.toString(),
      jobId,
      status: ENHANCEMENT_STATUS.QUEUED,
      asset: await this.serializeForUser(asset, userId),
    };
  }

  encodeCursor(data) {
    return Buffer.from(JSON.stringify({
      createdAt: data.createdAt.toISOString(),
      _id: data._id.toString(),
    })).toString('base64');
  }

  decodeCursor(cursor) {
    try {
      const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
      return {
        createdAt: new Date(decoded.createdAt),
        _id: decoded._id,
      };
    } catch (error) {
      throw buildError('Cursor khÃ´ng há»£p lá»‡', 400, 'INVALID_CURSOR');
    }
  }
}

module.exports = new AssetService();
