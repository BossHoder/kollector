const mongoose = require('mongoose');
const { SUBSCRIPTION_TIERS } = require('../modules/subscription/subscription.constants');

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

const monthlyUsageCounterSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    monthKey: {
      type: String,
      required: true,
      match: [MONTH_KEY_PATTERN, 'monthKey must use UTC format YYYY-MM'],
      index: true,
    },
    tierAtWindowStart: {
      type: String,
      enum: Object.values(SUBSCRIPTION_TIERS),
      required: true,
    },
    allowance: {
      type: Number,
      min: 1,
      required: true,
    },
    reservedCount: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
    },
    consumedCount: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
    },
    releasedCount: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

monthlyUsageCounterSchema.index({ userId: 1, monthKey: 1 }, { unique: true });

module.exports =
  mongoose.models.MonthlyUsageCounter ||
  mongoose.model('MonthlyUsageCounter', monthlyUsageCounterSchema);
