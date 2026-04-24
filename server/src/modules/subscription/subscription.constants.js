const SUBSCRIPTION_TIERS = Object.freeze({
  FREE: 'free',
  VIP: 'vip',
});

const SUBSCRIPTION_STATUS = Object.freeze({
  ACTIVE: 'active',
  GRACE_PENDING_RENEWAL: 'grace_pending_renewal',
  EXPIRED: 'expired',
});

const SUBSCRIPTION_REQUEST_TYPES = Object.freeze({
  UPGRADE: 'upgrade',
  RENEWAL: 'renewal',
});

const SUBSCRIPTION_REQUEST_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
});

const SUBSCRIPTION_PAYMENT_CHANNELS = Object.freeze({
  MANUAL_BANK: 'manual_bank',
  GOOGLE_PLAY: 'google_play',
  APP_STORE: 'app_store',
});

const SUBSCRIPTION_LIMITS = Object.freeze({
  [SUBSCRIPTION_TIERS.FREE]: Object.freeze({
    assetLimit: 20,
    monthlyProcessingLimit: 20,
    maintenanceExpMultiplier: 1,
    freeThemePresetCount: 2,
  }),
  [SUBSCRIPTION_TIERS.VIP]: Object.freeze({
    assetLimit: 200,
    monthlyProcessingLimit: 400,
    maintenanceExpMultiplier: 3,
    priceUsdMonthly: 0.99,
  }),
});

const SUBSCRIPTION_ERROR_CODES = Object.freeze({
  ASSET_LIMIT_REACHED: 'ASSET_LIMIT_REACHED',
  PROCESSING_QUOTA_REACHED: 'PROCESSING_QUOTA_REACHED',
  THEME_TIER_LOCKED: 'THEME_TIER_LOCKED',
  SUBSCRIPTION_NOT_FOUND: 'SUBSCRIPTION_NOT_FOUND',
  UPGRADE_REQUEST_NOT_FOUND: 'UPGRADE_REQUEST_NOT_FOUND',
  UPGRADE_REQUEST_ALREADY_FINALIZED: 'UPGRADE_REQUEST_ALREADY_FINALIZED',
});

const QUOTA_OUTCOMES = Object.freeze({
  BLOCKED: 'blocked',
  RESERVED: 'reserved',
  CONSUMED: 'consumed',
  RELEASED: 'released',
});

module.exports = {
  QUOTA_OUTCOMES,
  SUBSCRIPTION_ERROR_CODES,
  SUBSCRIPTION_LIMITS,
  SUBSCRIPTION_PAYMENT_CHANNELS,
  SUBSCRIPTION_REQUEST_STATUS,
  SUBSCRIPTION_REQUEST_TYPES,
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_TIERS,
};
