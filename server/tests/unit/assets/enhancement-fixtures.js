const {
  DEFAULT_ENHANCEMENT_OPTIONS,
  ENHANCEMENT_JOB_TYPE,
  ENHANCEMENT_QUEUE_NAME,
} = require('../../../src/modules/assets/enhancement.constants');

function buildEnhancementJobPayload(overrides = {}) {
  return {
    jobType: ENHANCEMENT_JOB_TYPE,
    queue: ENHANCEMENT_QUEUE_NAME,
    assetId: '507f1f77bcf86cd799439011',
    userId: '507f1f77bcf86cd799439012',
    originalImageUrl: 'https://example.com/assets/original.jpg',
    requestedAt: '2026-03-24T09:00:00.000Z',
    attempt: 1,
    options: DEFAULT_ENHANCEMENT_OPTIONS,
    ...overrides,
  };
}

function buildEnhancementSuccessEvent(overrides = {}) {
  return {
    event: 'asset_image_enhanced',
    assetId: '507f1f77bcf86cd799439011',
    status: 'succeeded',
    enhancedImageUrl: 'https://example.com/assets/enhanced.jpg',
    attemptCount: 1,
    timestamp: '2026-03-24T09:01:00.000Z',
    ...overrides,
  };
}

function buildEnhancementFailureEvent(overrides = {}) {
  return {
    event: 'asset_image_enhanced',
    assetId: '507f1f77bcf86cd799439011',
    status: 'failed',
    error: 'Enhancement failed after 3 attempts',
    attemptCount: 3,
    timestamp: '2026-03-24T09:02:00.000Z',
    ...overrides,
  };
}

module.exports = {
  buildEnhancementFailureEvent,
  buildEnhancementJobPayload,
  buildEnhancementSuccessEvent,
};
