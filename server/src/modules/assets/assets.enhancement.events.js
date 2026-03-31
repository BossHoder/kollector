const { getIO } = require('../../config/socket');
const logger = require('../../config/logger');
const { ENHANCEMENT_EVENT_NAME } = require('./enhancement.constants');

function buildEnhancementSuccessPayload(assetId, enhancedImageUrl, attemptCount) {
  return {
    event: ENHANCEMENT_EVENT_NAME,
    assetId: String(assetId),
    status: 'succeeded',
    enhancedImageUrl,
    attemptCount,
    timestamp: new Date().toISOString(),
  };
}

function buildEnhancementFailurePayload(assetId, error, attemptCount) {
  return {
    event: ENHANCEMENT_EVENT_NAME,
    assetId: String(assetId),
    status: 'failed',
    error: error || 'Enhancement failed',
    attemptCount,
    timestamp: new Date().toISOString(),
  };
}

function emitAssetImageEnhanced(userId, payload) {
  const io = getIO();

  if (!io) {
    logger.warn('Cannot emit asset_image_enhanced: Socket.io not initialized', {
      userId,
      assetId: payload.assetId,
    });
    return;
  }

  const room = `user:${userId}`;
  io.to(room).emit(ENHANCEMENT_EVENT_NAME, payload);

  logger.info('asset_image_enhanced event emitted', {
    userId,
    room,
    assetId: payload.assetId,
    status: payload.status,
  });
}

module.exports = {
  buildEnhancementFailurePayload,
  buildEnhancementSuccessPayload,
  emitAssetImageEnhanced,
};
