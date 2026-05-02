const { getIO } = require('../../config/socket');
const logger = require('../../config/logger');

function buildSubscriptionTierChangedEvent({
  occurredAt,
  userId,
  fromTier,
  toTier,
  reason,
  effectiveAt,
  expiresAt = null,
  graceEndsAt = null,
}) {
  return {
    event: 'subscription_tier_changed',
    occurredAt,
    userId,
    fromTier,
    toTier,
    reason,
    effectiveAt,
    expiresAt,
    graceEndsAt,
  };
}

function buildSubscriptionQuotaUpdatedEvent({
  occurredAt,
  userId,
  actionType,
  idempotencyKey,
  outcome,
  usage,
}) {
  return {
    event: 'subscription_quota_updated',
    occurredAt,
    userId,
    actionType,
    idempotencyKey,
    outcome,
    usage,
  };
}

function emitSubscriptionTierChanged(userId, payload) {
  const io = getIO();

  if (!io) {
    logger.warn('Cannot emit subscription_tier_changed: Socket.io not initialized', {
      userId,
    });
    return;
  }

  io.to(`user:${userId}`).emit('subscription_tier_changed', payload);
}

function emitApprovedSubscriptionTierChange({
  occurredAt,
  userId,
  fromTier,
  toTier,
  reason,
  effectiveAt,
  expiresAt,
  graceEndsAt = null,
}) {
  const payload = buildSubscriptionTierChangedEvent({
    occurredAt,
    userId,
    fromTier,
    toTier,
    reason,
    effectiveAt,
    expiresAt,
    graceEndsAt,
  });

  emitSubscriptionTierChanged(userId, payload);
  return payload;
}

function emitSubscriptionTierTransition({
  occurredAt,
  userId,
  fromTier,
  toTier,
  reason,
  effectiveAt,
  expiresAt = null,
  graceEndsAt = null,
}) {
  const payload = buildSubscriptionTierChangedEvent({
    occurredAt,
    userId,
    fromTier,
    toTier,
    reason,
    effectiveAt,
    expiresAt,
    graceEndsAt,
  });

  emitSubscriptionTierChanged(userId, payload);
  return payload;
}

function emitSubscriptionQuotaUpdated(userId, payload) {
  const io = getIO();

  if (!io) {
    logger.warn('Cannot emit subscription_quota_updated: Socket.io not initialized', {
      userId,
    });
    return;
  }

  io.to(`user:${userId}`).emit('subscription_quota_updated', payload);
}

module.exports = {
  buildSubscriptionQuotaUpdatedEvent,
  buildSubscriptionTierChangedEvent,
  emitApprovedSubscriptionTierChange,
  emitSubscriptionQuotaUpdated,
  emitSubscriptionTierTransition,
  emitSubscriptionTierChanged,
};
