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
      'Đã đạt giới hạn tạo tài sản của gói hiện tại',
      details,
      429
    );
  }
}

class ProcessingQuotaReachedError extends SubscriptionError {
  constructor(details = {}) {
    super(
      SUBSCRIPTION_ERROR_CODES.PROCESSING_QUOTA_REACHED,
      'Đã đạt giới hạn xử lý ảnh trong tháng',
      details,
      429
    );
  }
}

class ThemeTierLockedError extends SubscriptionError {
  constructor(details = {}) {
    super(
      SUBSCRIPTION_ERROR_CODES.THEME_TIER_LOCKED,
      'Preset đã chọn yêu cầu gói VIP',
      details,
      403
    );
  }
}

function toSubscriptionErrorPayload(error) {
  return {
    error: {
      code: error.code || 'SUBSCRIPTION_ERROR',
      message: error.message || 'Thao tác gói đăng ký thất bại',
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
