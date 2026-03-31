const ENHANCEMENT_QUEUE_NAME = 'asset-enhancement';
const ENHANCEMENT_EVENT_NAME = 'asset_image_enhanced';
const ENHANCEMENT_JOB_NAME = 'enhance-asset-image';
const ENHANCEMENT_JOB_TYPE = 'asset_image_enhancement';
const ENHANCEMENT_MAX_ATTEMPTS = 3;

const ENHANCEMENT_STATUS = Object.freeze({
  IDLE: 'idle',
  QUEUED: 'queued',
  PROCESSING: 'processing',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
});

const ENHANCEMENT_ACTIVE_STATUSES = Object.freeze([
  ENHANCEMENT_STATUS.QUEUED,
  ENHANCEMENT_STATUS.PROCESSING,
]);

const DEFAULT_ENHANCEMENT_OPTIONS = Object.freeze({
  resize: {
    enabled: true,
    maxWidth: 2048,
    maxHeight: 2048,
    kernel: 'lanczos',
  },
  sharpen: {
    enabled: true,
    method: 'unsharp',
  },
  crop: {
    enabled: true,
    mode: 'heuristic',
  },
});

module.exports = {
  DEFAULT_ENHANCEMENT_OPTIONS,
  ENHANCEMENT_ACTIVE_STATUSES,
  ENHANCEMENT_EVENT_NAME,
  ENHANCEMENT_JOB_NAME,
  ENHANCEMENT_JOB_TYPE,
  ENHANCEMENT_MAX_ATTEMPTS,
  ENHANCEMENT_QUEUE_NAME,
  ENHANCEMENT_STATUS,
};
