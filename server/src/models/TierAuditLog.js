const mongoose = require('mongoose');
const { SUBSCRIPTION_TIERS } = require('../modules/subscription/subscription.constants');

const tierAuditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fromTier: {
      type: String,
      enum: Object.values(SUBSCRIPTION_TIERS),
      required: true,
    },
    toTier: {
      type: String,
      enum: Object.values(SUBSCRIPTION_TIERS),
      required: true,
    },
    reason: {
      type: String,
      enum: ['upgrade_approved', 'renewal_approved', 'expiry', 'downgrade_manual', 'grace_elapsed'],
      required: true,
    },
    effectiveAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.TierAuditLog || mongoose.model('TierAuditLog', tierAuditLogSchema);
