const mongoose = require('mongoose');
const {
  SUBSCRIPTION_PAYMENT_CHANNELS,
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_TIERS,
} = require('../modules/subscription/subscription.constants');

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    tier: {
      type: String,
      enum: Object.values(SUBSCRIPTION_TIERS),
      default: SUBSCRIPTION_TIERS.FREE,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(SUBSCRIPTION_STATUS),
      default: SUBSCRIPTION_STATUS.ACTIVE,
      required: true,
    },
    paymentChannel: {
      type: String,
      enum: Object.values(SUBSCRIPTION_PAYMENT_CHANNELS),
      default: SUBSCRIPTION_PAYMENT_CHANNELS.MANUAL_BANK,
      required: true,
    },
    activatedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    graceEndsAt: {
      type: Date,
      default: null,
    },
    lastApprovedRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionUpgradeRequest',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

subscriptionSchema.path('graceEndsAt').validate(function validateGraceEnd(value) {
  if (this.status === SUBSCRIPTION_STATUS.GRACE_PENDING_RENEWAL && !value) {
    return false;
  }

  return true;
}, 'graceEndsAt is required while status is grace_pending_renewal');

module.exports = mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema);
