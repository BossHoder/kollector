const mongoose = require('mongoose');
const {
  SUBSCRIPTION_REQUEST_STATUS,
  SUBSCRIPTION_REQUEST_TYPES,
} = require('../modules/subscription/subscription.constants');

const PROOF_RETENTION_DAYS = 30;
const METADATA_RETENTION_DAYS = 180;

function addDays(baseDate, days) {
  const date = new Date(baseDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

const proofFileSchema = new mongoose.Schema(
  {
    storageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    deleteAt: {
      type: Date,
      default: function resolveDeleteAt() {
        const source = this.uploadedAt || new Date();
        return addDays(source, PROOF_RETENTION_DAYS);
      },
      required: true,
    },
  },
  { _id: false }
);

const proofMetadataSchema = new mongoose.Schema(
  {
    amount: { type: Number, min: 0, default: null },
    currency: { type: String, trim: true, uppercase: true, default: null },
    bankLabel: { type: String, trim: true, default: null },
    payerMask: { type: String, trim: true, default: null },
  },
  { _id: false }
);

const subscriptionUpgradeRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(SUBSCRIPTION_REQUEST_TYPES),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(SUBSCRIPTION_REQUEST_STATUS),
      default: SUBSCRIPTION_REQUEST_STATUS.PENDING,
      required: true,
      index: true,
    },
    transferReference: {
      type: String,
      trim: true,
      default: null,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: null,
    },
    proofFile: {
      type: proofFileSchema,
      default: null,
    },
    proofMetadata: {
      type: proofMetadataSchema,
      default: () => ({}),
    },
    proofFilePurgedAt: {
      type: Date,
      default: null,
      index: true,
    },
    metadataExpireAt: {
      type: Date,
      default: function resolveMetadataExpireAt() {
        return addDays(this.submittedAt || new Date(), METADATA_RETENTION_DAYS);
      },
      required: true,
      index: true,
    },
    metadataPurgedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

subscriptionUpgradeRequestSchema.path('transferReference').validate(function validateTransferReference(value) {
  if (this.status === SUBSCRIPTION_REQUEST_STATUS.PENDING && !String(value || '').trim()) {
    return false;
  }

  return true;
}, 'transferReference is required for pending requests');

subscriptionUpgradeRequestSchema.pre('validate', function assignRetentionWindows() {
  if (this.proofFile && !this.proofFile.deleteAt) {
    const source = this.proofFile.uploadedAt || this.submittedAt || new Date();
    this.proofFile.deleteAt = addDays(source, PROOF_RETENTION_DAYS);
  }

  if (!this.metadataExpireAt) {
    this.metadataExpireAt = addDays(this.submittedAt || new Date(), METADATA_RETENTION_DAYS);
  }
});

module.exports =
  mongoose.models.SubscriptionUpgradeRequest ||
  mongoose.model('SubscriptionUpgradeRequest', subscriptionUpgradeRequestSchema);
