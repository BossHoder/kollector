const Asset = require('../../models/Asset');
const { getAssetThemePresets } = require('../assets/theme-presets.catalog');
const {
  QUOTA_OUTCOMES,
  SUBSCRIPTION_ERROR_CODES,
  SUBSCRIPTION_LIMITS,
  SUBSCRIPTION_REQUEST_STATUS,
  SUBSCRIPTION_TIERS,
} = require('./subscription.constants');
const {
  buildSubscriptionTierChangedEvent,
  emitSubscriptionTierChanged,
} = require('./subscription.events');
const { defaultQuotaService, currentUtcMonthKey, nextUtcMonthIso } = require('./quota.service');
const repository = require('./subscription.repository');

const FREE_THEME_DEFAULT_ID = 'vault-graphite';
const FREE_THEME_LIGHT_ID = 'ledger-ivory';
const VIP_BILLING_DAYS = 30;

function addDays(baseDate, days) {
  const date = new Date(baseDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
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

class SubscriptionService {
  async evaluateAssetCreationEntitlement(userId) {
    const subscription = await this.ensureUserSubscription(userId);
    const tierLimits = SUBSCRIPTION_LIMITS[subscription.tier] || SUBSCRIPTION_LIMITS[SUBSCRIPTION_TIERS.FREE];
    const used = await Asset.countDocuments({ userId });
    const remaining = Math.max(tierLimits.assetLimit - used, 0);

    return {
      tier: subscription.tier,
      used,
      limit: tierLimits.assetLimit,
      remaining,
    };
  }

  async assertAssetCreationAllowed(userId) {
    const entitlement = await this.evaluateAssetCreationEntitlement(userId);

    if (entitlement.used >= entitlement.limit) {
      throw buildError(
        429,
        'ASSET_LIMIT_REACHED',
        'Asset creation limit reached for current tier',
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

  async ensureUserSubscription(userId) {
    let subscription = await repository.findSubscriptionByUserId(userId);

    if (!subscription) {
      subscription = await repository.createDefaultSubscription(userId, {
        tier: SUBSCRIPTION_TIERS.FREE,
      });
    }

    return subscription;
  }

  async evaluateProcessingQuota(userId) {
    const subscription = await this.ensureUserSubscription(userId);
    const tierLimits = SUBSCRIPTION_LIMITS[subscription.tier] || SUBSCRIPTION_LIMITS[SUBSCRIPTION_TIERS.FREE];
    const monthKey = currentUtcMonthKey();
    const usage = await defaultQuotaService.getUsageSnapshot({
      userId,
      monthKey,
      allowance: tierLimits.monthlyProcessingLimit,
      tier: subscription.tier,
    });

    return {
      tier: subscription.tier,
      limit: tierLimits.monthlyProcessingLimit,
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
      throw buildError(
        429,
        SUBSCRIPTION_ERROR_CODES.PROCESSING_QUOTA_REACHED,
        'Monthly image-processing quota reached',
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

    const tierLimits = SUBSCRIPTION_LIMITS[subscription.tier] || SUBSCRIPTION_LIMITS[SUBSCRIPTION_TIERS.FREE];
    const monthKey = currentUtcMonthKey();
    const usageSnapshot = await defaultQuotaService.getUsageSnapshot({
      userId,
      monthKey,
      allowance: tierLimits.monthlyProcessingLimit,
      tier: subscription.tier,
    });

    const assetEntitlement = await this.evaluateAssetCreationEntitlement(userId);

    return {
      tier: subscription.tier,
      status: subscription.status,
      effectiveAt: (subscription.activatedAt || subscription.createdAt || new Date()).toISOString(),
      expiresAt: subscription.expiresAt ? subscription.expiresAt.toISOString() : null,
      graceEndsAt: subscription.graceEndsAt ? subscription.graceEndsAt.toISOString() : null,
      entitlements: {
        assetLimit: tierLimits.assetLimit,
        processingMonthlyLimit: tierLimits.monthlyProcessingLimit,
        maintenanceExpMultiplier: tierLimits.maintenanceExpMultiplier,
        priceUsdMonthly: tierLimits.priceUsdMonthly || null,
        theme: buildThemeEntitlement(subscription.tier),
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
      throw buildError(404, 'UPGRADE_REQUEST_NOT_FOUND', 'Upgrade request not found');
    }

    return mapUpgradeRequest(request);
  }

  async adminListUpgradeRequests(filters = {}) {
    const requests = await repository.listUpgradeRequests(filters);
    return requests.map(mapUpgradeRequest);
  }

  async adminApproveUpgradeRequest(requestId, actorId, decision = {}) {
    const existing = await repository.findUpgradeRequestById(requestId);

    if (!existing) {
      throw buildError(404, 'UPGRADE_REQUEST_NOT_FOUND', 'Upgrade request not found');
    }

    if (existing.status !== SUBSCRIPTION_REQUEST_STATUS.PENDING) {
      throw buildError(409, 'UPGRADE_REQUEST_ALREADY_FINALIZED', 'Upgrade request already finalized');
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

    const expiresAt =
      subscription.expiresAt && subscription.expiresAt > now
        ? addDays(subscription.expiresAt, VIP_BILLING_DAYS)
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

    emitSubscriptionTierChanged(
      String(existing.userId),
      buildSubscriptionTierChangedEvent({
        occurredAt: now.toISOString(),
        userId: String(existing.userId),
        fromTier,
        toTier,
        reason: existing.type === 'renewal' ? 'renewal_approved' : 'upgrade_approved',
        effectiveAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        graceEndsAt: null,
      })
    );

    return {
      ...mapUpgradeRequest(reviewed),
      tierAfterApproval: updatedSubscription.tier,
    };
  }

  async adminRejectUpgradeRequest(requestId, actorId, decision = {}) {
    const existing = await repository.findUpgradeRequestById(requestId);

    if (!existing) {
      throw buildError(404, 'UPGRADE_REQUEST_NOT_FOUND', 'Upgrade request not found');
    }

    if (existing.status !== SUBSCRIPTION_REQUEST_STATUS.PENDING) {
      throw buildError(409, 'UPGRADE_REQUEST_ALREADY_FINALIZED', 'Upgrade request already finalized');
    }

    const reason = String(decision.reason || '').trim();
    if (!reason) {
      throw buildError(400, 'VALIDATION_ERROR', 'Rejection reason is required');
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
