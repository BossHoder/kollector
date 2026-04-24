const { SUBSCRIPTION_ERROR_CODES } = require('./subscription.constants');

class SubscriptionError extends Error {
  constructor(code, message, details = {}, status = 400) {
    super(message);
    this.name = 'SubscriptionError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

class AssetLimitReachedError extends SubscriptionError {
  constructor(details = {}) {
    super(
      SUBSCRIPTION_ERROR_CODES.ASSET_LIMIT_REACHED,
      'Asset creation limit reached for current tier',
      details,
      429
    );
  }
}

class ProcessingQuotaReachedError extends SubscriptionError {
  constructor(details = {}) {
    super(
      SUBSCRIPTION_ERROR_CODES.PROCESSING_QUOTA_REACHED,
      'Monthly image-processing quota reached',
      details,
      429
    );
  }
}

class ThemeTierLockedError extends SubscriptionError {
  constructor(details = {}) {
    super(
      SUBSCRIPTION_ERROR_CODES.THEME_TIER_LOCKED,
      'Selected preset requires VIP tier',
      details,
      403
    );
  }
}

function toSubscriptionErrorPayload(error) {
  return {
    error: {
      code: error.code || 'SUBSCRIPTION_ERROR',
      message: error.message || 'Subscription operation failed',
      details: error.details || {},
    },
  };
}

module.exports = {
  AssetLimitReachedError,
  ProcessingQuotaReachedError,
  SubscriptionError,
  ThemeTierLockedError,
  toSubscriptionErrorPayload,
};
