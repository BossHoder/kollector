const mongoose = require('mongoose');
const { QUOTA_OUTCOMES } = require('../modules/subscription/subscription.constants');

const quotaAuditLogSchema = new mongoose.Schema(
  {
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
    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    usageDelta: {
      type: Number,
      required: true,
      default: 0,
    },
    outcome: {
      type: String,
      enum: Object.values(QUOTA_OUTCOMES),
      required: true,
      index: true,
    },
    recordedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.QuotaAuditLog || mongoose.model('QuotaAuditLog', quotaAuditLogSchema);
