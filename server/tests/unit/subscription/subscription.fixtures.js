const {
  SUBSCRIPTION_PAYMENT_CHANNELS,
  SUBSCRIPTION_REQUEST_STATUS,
  SUBSCRIPTION_REQUEST_TYPES,
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_TIERS,
} = require('../../../src/modules/subscription/subscription.constants');

function nowIso() {
  return new Date().toISOString();
}

function monthKeyFrom(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function buildSubscription(overrides = {}) {
  return {
    userId: 'user-1',
    tier: SUBSCRIPTION_TIERS.FREE,
    status: SUBSCRIPTION_STATUS.ACTIVE,
    paymentChannel: SUBSCRIPTION_PAYMENT_CHANNELS.MANUAL_BANK,
    activatedAt: nowIso(),
    expiresAt: null,
    graceEndsAt: null,
    updatedAt: nowIso(),
    ...overrides,
  };
}

function buildUpgradeRequest(overrides = {}) {
  const submittedAt = overrides.submittedAt || nowIso();
  const metadataExpireAt =
    overrides.metadataExpireAt || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();

  return {
    id: 'req-1',
    userId: 'user-1',
    type: SUBSCRIPTION_REQUEST_TYPES.UPGRADE,
    status: SUBSCRIPTION_REQUEST_STATUS.PENDING,
    transferReference: 'TXN-001',
    submittedAt,
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
    proofFile: {
      storageUrl: 'https://example.com/proof.png',
      uploadedAt: submittedAt,
      deleteAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    proofMetadata: {
      amount: 0.99,
      currency: 'USD',
      bankLabel: 'Mock Bank',
      payerMask: '****1234',
    },
    metadataExpireAt,
    ...overrides,
  };
}

function buildMonthlyUsageCounter(overrides = {}) {
  return {
    userId: 'user-1',
    monthKey: monthKeyFrom(),
    tierAtWindowStart: SUBSCRIPTION_TIERS.FREE,
    allowance: 20,
    reservedCount: 0,
    consumedCount: 0,
    releasedCount: 0,
    updatedAt: nowIso(),
    ...overrides,
  };
}

function buildQuotaLedgerEntry(overrides = {}) {
  return {
    idempotencyKey: 'idem-1',
    userId: 'user-1',
    actionType: 'analyze_queue',
    resourceId: 'asset-1',
    monthKey: monthKeyFrom(),
    state: 'reserved',
    failureClass: null,
    createdAt: nowIso(),
    finalizedAt: null,
    ...overrides,
  };
}

module.exports = {
  buildMonthlyUsageCounter,
  buildQuotaLedgerEntry,
  buildSubscription,
  buildUpgradeRequest,
  monthKeyFrom,
};
