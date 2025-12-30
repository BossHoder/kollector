/**
 * Socket.io Event Emitters for Asset Processing
 * Emits asset_processed events to user rooms
 * @module modules/assets/assets.events
 */

const { getIO } = require('../../config/socket');
const logger = require('../../config/logger');

/**
 * Emit asset_processed event to user's room
 * Payload conforms to asset-processed-event.schema.json
 * 
 * @param {string} userId - User ID for room targeting
 * @param {Object} payload - Event payload
 * @param {string} payload.assetId - Asset ID
 * @param {string} payload.status - 'active' or 'failed'
 * @param {Object} [payload.aiMetadata] - AI extraction results (for success)
 * @param {string} [payload.processedImageUrl] - Processed image URL (for success)
 * @param {string} [payload.error] - Error message (for failure)
 */
function emitAssetProcessed(userId, payload) {
  const io = getIO();
  
  if (!io) {
    logger.warn('Cannot emit asset_processed: Socket.io not initialized', {
      userId,
      assetId: payload.assetId
    });
    return;
  }

  const room = `user:${userId}`;
  const timestamp = new Date().toISOString();

  let eventPayload;

  if (payload.status === 'active') {
    // Success event per SuccessEvent schema
    eventPayload = {
      event: 'asset_processed',
      assetId: String(payload.assetId),
      status: 'active',
      aiMetadata: {
        brand: payload.aiMetadata?.brand || { value: '', confidence: 0 },
        model: payload.aiMetadata?.model || { value: '', confidence: 0 },
        colorway: payload.aiMetadata?.colorway
      },
      processedImageUrl: payload.processedImageUrl,
      timestamp
    };

    // Remove undefined colorway if not present
    if (!eventPayload.aiMetadata.colorway) {
      delete eventPayload.aiMetadata.colorway;
    }
  } else {
    // Failure event per FailureEvent schema
    eventPayload = {
      event: 'asset_processed',
      assetId: String(payload.assetId),
      status: 'failed',
      error: payload.error || 'Processing failed',
      timestamp
    };
  }

  io.to(room).emit('asset_processed', eventPayload);

  logger.info('asset_processed event emitted', {
    userId,
    room,
    assetId: payload.assetId,
    status: payload.status
  });
}

/**
 * Build success event payload
 * @param {string} assetId - Asset ID
 * @param {Object} aiMetadata - AI extraction results
 * @param {string} processedImageUrl - Processed image URL
 * @returns {Object} Success event payload
 */
function buildSuccessPayload(assetId, aiMetadata, processedImageUrl) {
  return {
    assetId: String(assetId),
    status: 'active',
    aiMetadata,
    processedImageUrl
  };
}

/**
 * Build failure event payload
 * @param {string} assetId - Asset ID
 * @param {string} error - Error message
 * @returns {Object} Failure event payload
 */
function buildFailurePayload(assetId, error) {
  return {
    assetId: String(assetId),
    status: 'failed',
    error
  };
}

module.exports = {
  emitAssetProcessed,
  buildSuccessPayload,
  buildFailurePayload
};
