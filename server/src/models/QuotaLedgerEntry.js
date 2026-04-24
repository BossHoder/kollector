const mongoose = require('mongoose');
const { QUOTA_OUTCOMES } = require('../modules/subscription/subscription.constants');

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

const quotaLedgerEntrySchema = new mongoose.Schema(
  {
    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actionType: {
      type: String,
      enum: ['analyze_queue', 'enhance_image'],
      required: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      default: null,
    },
    monthKey: {
      type: String,
      required: true,
      match: [MONTH_KEY_PATTERN, 'monthKey must use UTC format YYYY-MM'],
      index: true,
    },
    state: {
      type: String,
      enum: Object.values(QUOTA_OUTCOMES),
      required: true,
      index: true,
    },
    failureClass: {
      type: String,
      enum: ['internal_system', 'business_validation', 'client_cancelled', null],
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    finalizedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.QuotaLedgerEntry || mongoose.model('QuotaLedgerEntry', quotaLedgerEntrySchema);
