const Asset = require('../../models/Asset');
const { getAssetThemePresets } = require('../assets/theme-presets.catalog');
const {
  QUOTA_OUTCOMES,
  SUBSCRIPTION_ERROR_CODES,
  SUBSCRIPTION_LIMITS,
  SUBSCRIPTION_REQUEST_STATUS,
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_TIERS,
} = require('./subscription.constants');
const {
  emitApprovedSubscriptionTierChange,
  emitSubscriptionTierTransition,
} = require('./subscription.events');
const { defaultQuotaService, currentUtcMonthKey, nextUtcMonthIso } = require('./quota.service');
const repository = require('./subscription.repository');
const { shouldEnforceSubscriptionLimits } = require('../../config/subscription.config');

const FREE_THEME_DEFAULT_ID = 'vault-graphite';
const FREE_THEME_LIGHT_ID = 'ledger-ivory';
const VIP_BILLING_DAYS = 30;
const GRACE_PERIOD_HOURS = 72;

function addDays(baseDate, days) {
  const date = new Date(baseDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function addHours(baseDate, hours) {
  const date = new Date(baseDate);
  date.setUTCHours(date.getUTCHours() + hours);
  return date;
}

function isDateInFuture(value, now = new Date()) {
  return value instanceof Date && value.getTime() > now.getTime();
}

function isDateReached(value, now = new Date()) {
  return value instanceof Date && value.getTime() <= now.getTime();
}

function buildError(status, code, message, details = {}) {
  const error = new Error(message);
  error.statusCode = status;
  error.code = code;
  error.details = details;
  return error;
}

function mapUpgradeRequest(request) {
  return {
    id: String(request._id),
    userId: String(request.userId),
    type: request.type,
    status: request.status,
    transferReference: request.transferReference,
    submittedAt: request.submittedAt?.toISOString() || null,
    reviewedAt: request.reviewedAt?.toISOString() || null,
    reviewedBy: request.reviewedBy ? String(request.reviewedBy) : null,
    rejectionReason: request.rejectionReason || null,
    proofFileDeleteAt: request.proofFile?.deleteAt?.toISOString() || null,
    metadataExpireAt: request.metadataExpireAt?.toISOString() || null,
  };
}

function mapAdminUpgradeRequest(request) {
  const base = mapUpgradeRequest(request);
  const submitter =
    request.userId && typeof request.userId === 'object'
      ? {
          id: String(request.userId._id || request.userId.id),
          email: request.userId.email || null,
          displayName: request.userId.profile?.displayName || null,
          role: request.userId.role || 'user',
        }
      : {
          id: String(request.userId),
          email: null,
          displayName: null,
          role: 'user',
        };
  const reviewer =
    request.reviewedBy && typeof request.reviewedBy === 'object'
      ? {
          id: String(request.reviewedBy._id || request.reviewedBy.id),
          email: request.reviewedBy.email || null,
          displayName: request.reviewedBy.profile?.displayName || null,
          role: request.reviewedBy.role || 'admin',
        }
      : request.reviewedBy
        ? {
            id: String(request.reviewedBy),
            email: null,
            displayName: null,
            role: 'admin',
          }
        : null;

  return {
    ...base,
    user: submitter,
    payment: {
      amount: request.proofMetadata?.amount ?? null,
      currency: request.proofMetadata?.currency ?? null,
      bankLabel: request.proofMetadata?.bankLabel ?? null,
      payerMask: request.proofMetadata?.payerMask ?? null,
    },
    review: {
      reviewedAt: base.reviewedAt,
      rejectionReason: base.rejectionReason,
      reviewer,
    },
  };
}

function buildThemeEntitlement(tier) {
  const allPresetIds = getAssetThemePresets().map((preset) => preset.id);

  if (tier === SUBSCRIPTION_TIERS.VIP) {
    return {
      selectablePresetIds: allPresetIds,
      lockedPresetIds: [],
      freeDefinition: {
        defaultPresetId: FREE_THEME_DEFAULT_ID,
        lightPresetId: FREE_THEME_LIGHT_ID,
      },
    };
  }

  const selectablePresetIds = [FREE_THEME_DEFAULT_ID, FREE_THEME_LIGHT_ID];
  const lockedPresetIds = allPresetIds.filter((presetId) => !selectablePresetIds.includes(presetId));

  return {
    selectablePresetIds,
    lockedPresetIds,
    freeDefinition: {
      defaultPresetId: FREE_THEME_DEFAULT_ID,
      lightPresetId: FREE_THEME_LIGHT_ID,
    },
  };
}

function getTierLimits(tier) {
  return SUBSCRIPTION_LIMITS[tier] || SUBSCRIPTION_LIMITS[SUBSCRIPTION_TIERS.FREE];
}

function resolveAccessTier(subscription) {
  if (
    subscription?.tier === SUBSCRIPTION_TIERS.VIP
    && subscription?.status !== SUBSCRIPTION_STATUS.EXPIRED
  ) {
    return SUBSCRIPTION_TIERS.VIP;
  }

  return SUBSCRIPTION_TIERS.FREE;
}

class SubscriptionService {
  async syncSubscriptionLifecycle(subscriptionOrUserId, now = new Date()) {
    const subscription = typeof subscriptionOrUserId === 'object' && subscriptionOrUserId !== null
      ? subscriptionOrUserId
      : await this.ensureUserSubscription(subscriptionOrUserId, { skipLifecycleSync: true });

    if (
      subscription.tier === SUBSCRIPTION_TIERS.VIP
      && subscription.status === SUBSCRIPTION_STATUS.GRACE_PENDING_RENEWAL
      && isDateReached(subscription.graceEndsAt, now)
    ) {
      return this.transitionToFreeTier(subscription, {
        now,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        reason: 'grace_elapsed',
      });
    }

    if (
      subscription.tier === SUBSCRIPTION_TIERS.VIP
      && subscription.status === SUBSCRIPTION_STATUS.ACTIVE
      && isDateReached(subscription.expiresAt, now)
    ) {
      const pendingRenewal = await repository.findPendingRenewalRequestSubmittedBefore(
        subscription.userId,
        subscription.expiresAt
      );

      if (pendingRenewal) {
        return repository.upsertSubscription(subscription.userId, {
          $set: {
            status: SUBSCRIPTION_STATUS.GRACE_PENDING_RENEWAL,
            graceEndsAt: addHours(subscription.expiresAt, GRACE_PERIOD_HOURS),
          },
        });
      }

      return this.transitionToFreeTier(subscription, {
        now,
        status: SUBSCRIPTION_STATUS.EXPIRED,
        reason: 'expiry',
      });
    }

    return subscription;
  }

  async transitionToFreeTier(subscription, {
    now = new Date(),
    status = SUBSCRIPTION_STATUS.ACTIVE,
    reason = 'grace_elapsed',
  } = {}) {
    const updatedSubscription = await repository.upsertSubscription(subscription.userId, {
      $set: {
        tier: SUBSCRIPTION_TIERS.FREE,
        status,
        graceEndsAt: null,
      },
    });

    await repository.createTierAuditLog({
      userId: subscription.userId,
      actorId: subscription.userId,
      fromTier: subscription.tier,
      toTier: SUBSCRIPTION_TIERS.FREE,
      reason,
      effectiveAt: now,
      expiresAt: subscription.expiresAt || null,
    });

    emitSubscriptionTierTransition({
      occurredAt: now.toISOString(),
      userId: String(subscription.userId),
      fromTier: subscription.tier,
      toTier: SUBSCRIPTION_TIERS.FREE,
      reason,
      effectiveAt: now.toISOString(),
      expiresAt: subscription.expiresAt ? subscription.expiresAt.toISOString() : null,
      graceEndsAt: null,
    });

    return updatedSubscription;
  }

  async evaluateAssetCreationEntitlement(userId) {
    const subscription = await this.ensureUserSubscription(userId);
    const tierLimits = getTierLimits(resolveAccessTier(subscription));
    const used = await Asset.countDocuments({ userId });
    const remaining = Math.max(tierLimits.assetLimit - used, 0);

    return {
      tier: resolveAccessTier(subscription),
      status: subscription.status,
      used,
      limit: tierLimits.assetLimit,
      remaining,
    };
  }

  async assertAssetCreationAllowed(userId) {
    const entitlement = await this.evaluateAssetCreationEntitlement(userId);

    if (entitlement.used >= entitlement.limit) {
      if (!shouldEnforceSubscriptionLimits()) {
        return {
          ...entitlement,
          softBlocked: true,
        };
      }

      throw buildError(
        429,
        'ASSET_LIMIT_REACHED',
        'Đã đạt giới hạn tạo tài sản của gói hiện tại',
        {
          tier: entitlement.tier,
          limitType: 'asset',
          used: entitlement.used,
          limit: entitlement.limit,
          nextResetAt: null,
        }
      );
    }

    return entitlement;
  }

  async ensureUserSubscription(userId, options = {}) {
    let subscription = await repository.findSubscriptionByUserId(userId);

    if (!subscription) {
      subscription = await repository.createDefaultSubscription(userId, {
        tier: SUBSCRIPTION_TIERS.FREE,
      });
    }

    if (!options.skipLifecycleSync) {
      subscription = await this.syncSubscriptionLifecycle(subscription, options.now || new Date());
    }

    return subscription;
  }

  async evaluateProcessingQuota(userId) {
    const subscription = await this.ensureUserSubscription(userId);
    const accessTier = resolveAccessTier(subscription);
    const tierLimits = getTierLimits(accessTier);
    const monthKey = currentUtcMonthKey();
    const usage = await defaultQuotaService.getUsageSnapshot({
      userId,
      monthKey,
      allowance: tierLimits.monthlyProcessingLimit,
      tier: accessTier,
    });

    return {
      tier: accessTier,
      limit: tierLimits.monthlyProcessingLimit,
      status: subscription.status,
      usage,
    };
  }

  async reserveProcessingQuota(userId, command) {
    const entitlement = await this.evaluateProcessingQuota(userId);
    const result = await defaultQuotaService.reserveQuota({
      userId,
      actionType: command.actionType,
      resourceId: command.resourceId || null,
      idempotencyKey: command.idempotencyKey,
      monthKey: currentUtcMonthKey(),
      allowance: entitlement.limit,
      tier: entitlement.tier,
    });

    if (result.outcome === QUOTA_OUTCOMES.BLOCKED) {
      if (!shouldEnforceSubscriptionLimits()) {
        return {
          ...result,
          softBlocked: true,
        };
      }

      throw buildError(
        429,
        SUBSCRIPTION_ERROR_CODES.PROCESSING_QUOTA_REACHED,
        'Đã đạt giới hạn xử lý ảnh trong tháng',
        {
          tier: entitlement.tier,
          limitType: 'processing',
          used: result.usage.used,
          limit: result.usage.allowance || entitlement.limit,
          nextResetAt: result.usage.nextResetAt,
        }
      );
    }

    return result;
  }

  async consumeProcessingQuota(command) {
    return defaultQuotaService.consumeQuota(command);
  }

  async releaseProcessingQuota(command, options = {}) {
    return defaultQuotaService.releaseQuota(command, options);
  }

  async getSubscriptionStatus(userId) {
    const subscription = await this.ensureUserSubscription(userId);
    const accessTier = resolveAccessTier(subscription);
    const tierLimits = getTierLimits(accessTier);
    const monthKey = currentUtcMonthKey();
    const usageSnapshot = await defaultQuotaService.getUsageSnapshot({
      userId,
      monthKey,
      allowance: tierLimits.monthlyProcessingLimit,
      tier: accessTier,
    });

    const assetEntitlement = await this.evaluateAssetCreationEntitlement(userId);

    return {
      tier: accessTier,
      status: subscription.status,
      effectiveAt: (subscription.activatedAt || subscription.createdAt || new Date()).toISOString(),
      expiresAt: subscription.expiresAt ? subscription.expiresAt.toISOString() : null,
      graceEndsAt: subscription.graceEndsAt ? subscription.graceEndsAt.toISOString() : null,
      entitlements: {
        assetLimit: tierLimits.assetLimit,
        processingMonthlyLimit: tierLimits.monthlyProcessingLimit,
        maintenanceExpMultiplier: tierLimits.maintenanceExpMultiplier,
        priceUsdMonthly: tierLimits.priceUsdMonthly || null,
        theme: buildThemeEntitlement(accessTier),
      },
      usage: {
        processingUsed: usageSnapshot.used,
        processingLimit: usageSnapshot.allowance,
        processingRemaining: usageSnapshot.remaining,
        nextResetAt: usageSnapshot.nextResetAt || nextUtcMonthIso(),
        assetUsed: assetEntitlement.used,
        assetLimit: assetEntitlement.limit,
      },
    };
  }

  async assertThemeSelectionAllowed(userId, themeId) {
    if (themeId === undefined || themeId === null) {
      return null;
    }

    const subscription = await this.ensureUserSubscription(userId);
    const accessTier = resolveAccessTier(subscription);
    const entitlement = buildThemeEntitlement(accessTier);

    if (entitlement.selectablePresetIds.includes(themeId)) {
      return themeId;
    }

    if (!shouldEnforceSubscriptionLimits()) {
      return themeId;
    }

    throw buildError(
      403,
      SUBSCRIPTION_ERROR_CODES.THEME_TIER_LOCKED,
      'Giao diện đã chọn bị khóa với gói đăng ký hiện tại',
      {
        tier: accessTier,
        lockedPresetId: themeId,
        selectablePresetIds: entitlement.selectablePresetIds,
      }
    );
  }

  async getMaintenanceExpMultiplier(userId) {
    const subscription = await this.ensureUserSubscription(userId);
    const accessTier = resolveAccessTier(subscription);
    return getTierLimits(accessTier).maintenanceExpMultiplier;
  }

  async createUpgradeRequest(userId, input) {
    const proofFile = input.proofFile
      ? {
          storageUrl: input.proofFile.storageUrl,
          uploadedAt: input.proofFile.uploadedAt || new Date(),
        }
      : null;

    const request = await repository.createUpgradeRequest({
      userId,
      type: input.type,
      status: SUBSCRIPTION_REQUEST_STATUS.PENDING,
      transferReference: input.transferReference,
      submittedAt: new Date(),
      proofFile,
      proofMetadata: {
        amount: input.amount ?? null,
        currency: input.currency ?? null,
        bankLabel: input.bankLabel ?? null,
        payerMask: input.payerMask ?? null,
      },
    });

    return mapUpgradeRequest(request);
  }

  async listOwnUpgradeRequests(userId) {
    const requests = await repository.listUpgradeRequestsByUser(userId);
    return requests.map(mapUpgradeRequest);
  }

  async getOwnUpgradeRequest(userId, requestId) {
    const request = await repository.findUpgradeRequestByIdForUser(requestId, userId);

    if (!request) {
      throw buildError(404, 'UPGRADE_REQUEST_NOT_FOUND', 'Không tìm thấy yêu cầu nâng gói');
    }

    return mapUpgradeRequest(request);
  }

  async adminListUpgradeRequests(filters = {}) {
    const requests = await repository.listUpgradeRequests(filters);
    return requests.map(mapAdminUpgradeRequest);
  }

  async adminApproveUpgradeRequest(requestId, actorId, decision = {}) {
    const existing = await repository.findUpgradeRequestById(requestId);

    if (!existing) {
      throw buildError(404, 'UPGRADE_REQUEST_NOT_FOUND', 'Không tìm thấy yêu cầu nâng gói');
    }

    if (existing.status !== SUBSCRIPTION_REQUEST_STATUS.PENDING) {
      throw buildError(409, 'UPGRADE_REQUEST_ALREADY_FINALIZED', 'Yêu cầu nâng gói đã được xử lý');
    }

    const reviewed = await repository.markUpgradeRequestReviewed(requestId, {
      status: SUBSCRIPTION_REQUEST_STATUS.APPROVED,
      reviewedAt: new Date(),
      reviewedBy: actorId,
      rejectionReason: decision.reason || null,
    });

    const subscription = await this.ensureUserSubscription(existing.userId);
    const now = new Date();
    const fromTier = subscription.tier;
    const toTier = SUBSCRIPTION_TIERS.VIP;
    const renewalDuringGrace =
      existing.type === 'renewal'
      && subscription.status === 'grace_pending_renewal'
      && isDateInFuture(subscription.graceEndsAt, now)
      && subscription.expiresAt instanceof Date;
    const activeRenewal =
      existing.type === 'renewal'
      && isDateInFuture(subscription.expiresAt, now);
    const renewalBaseDate =
      renewalDuringGrace || activeRenewal
        ? subscription.expiresAt
        : now;
    const expiresAt =
      existing.type === 'renewal'
        ? addDays(renewalBaseDate, VIP_BILLING_DAYS)
        : addDays(now, VIP_BILLING_DAYS);

    const updatedSubscription = await repository.upsertSubscription(existing.userId, {
      $set: {
        tier: toTier,
        status: 'active',
        activatedAt: now,
        expiresAt,
        graceEndsAt: null,
        lastApprovedRequestId: existing._id,
        paymentChannel: 'manual_bank',
      },
    });

    await repository.createTierAuditLog({
      userId: existing.userId,
      actorId,
      fromTier,
      toTier,
      reason: existing.type === 'renewal' ? 'renewal_approved' : 'upgrade_approved',
      effectiveAt: now,
      expiresAt,
    });

    emitApprovedSubscriptionTierChange({
      occurredAt: now.toISOString(),
      userId: String(existing.userId),
      fromTier,
      toTier,
      reason: existing.type === 'renewal' ? 'renewal_approved' : 'upgrade_approved',
      effectiveAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      graceEndsAt: null,
    });

    return {
      ...mapUpgradeRequest(reviewed),
      tierAfterApproval: updatedSubscription.tier,
    };
  }

  async adminRejectUpgradeRequest(requestId, actorId, decision = {}) {
    const existing = await repository.findUpgradeRequestById(requestId);

    if (!existing) {
      throw buildError(404, 'UPGRADE_REQUEST_NOT_FOUND', 'Không tìm thấy yêu cầu nâng gói');
    }

    if (existing.status !== SUBSCRIPTION_REQUEST_STATUS.PENDING) {
      throw buildError(409, 'UPGRADE_REQUEST_ALREADY_FINALIZED', 'Yêu cầu nâng gói đã được xử lý');
    }

    const reason = String(decision.reason || '').trim();
    if (!reason) {
      throw buildError(400, 'VALIDATION_ERROR', 'Lý do từ chối là bắt buộc');
    }

    const reviewed = await repository.markUpgradeRequestReviewed(requestId, {
      status: SUBSCRIPTION_REQUEST_STATUS.REJECTED,
      reviewedAt: new Date(),
      reviewedBy: actorId,
      rejectionReason: reason,
    });

    return mapUpgradeRequest(reviewed);
  }
}

module.exports = new SubscriptionService();
module.exports.SubscriptionService = SubscriptionService;

