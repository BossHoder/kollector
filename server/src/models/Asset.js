const mongoose = require('mongoose');
const {
  MAINTENANCE_XP,
  calculateDailyDecayAmount,
  calculateRestoreAmount,
  clampHealth,
  computeVisualLayersForHealth,
} = require('../modules/gamification/gamification.helpers');
const { ENHANCEMENT_STATUS } = require('../modules/assets/enhancement.constants');

const maintenanceLogSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  previousHealth: { type: Number, required: true, min: 0, max: 100 },
  newHealth: { type: Number, required: true, min: 0, max: 100 },
  healthRestored: { type: Number, required: true, min: 0 },
  xpAwarded: { type: Number, default: MAINTENANCE_XP, min: 0 },
}, { _id: true });

const assetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  category: { type: String, enum: ['sneaker', 'lego', 'camera', 'other'], required: true, trim: true, index: true },
  status: { type: String, enum: ['draft', 'processing', 'partial', 'active', 'archived', 'failed'], default: 'draft', index: true },

  images: {
    original: {
      url: { type: String, immutable: true },
      publicId: { type: String, immutable: true },
      uploadedAt: { type: Date, default: Date.now, immutable: true },
    },
    processed: { url: String, publicId: String, processedAt: Date },
    thumbnail: { url: String, publicId: String },
    card: { url: String, generatedAt: Date, expiresAt: Date },
    enhanced: {
      url: String,
      publicId: String,
      width: Number,
      height: Number,
      generatedAt: Date,
    },
  },

  presentation: {
    themeOverrideId: { type: String, default: null },
  },

  enhancement: {
    status: {
      type: String,
      enum: Object.values(ENHANCEMENT_STATUS),
      default: ENHANCEMENT_STATUS.IDLE,
    },
    lastJobId: String,
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    requestedAt: Date,
    completedAt: Date,
    errorCode: String,
    errorMessage: String,
    attemptCount: { type: Number, min: 0, max: 3, default: 0 },
  },

  originalFilename: { type: String, trim: true },
  mimeType: { type: String, trim: true },
  fileSizeBytes: { type: Number, min: 0 },

  aiMetadata: {
    brand: { value: String, confidence: Number },
    model: { value: String, confidence: Number },
    colorway: { value: String, confidence: Number },
    estimatedYear: { value: Number, confidence: Number },
    conditionNotes: String,
    rawResponse: String,
    processedAt: Date,
    error: String,
    failedAt: Date,
  },

  details: {
    brand: { type: String, trim: true },
    model: { type: String, trim: true },
    colorway: { type: String, trim: true },
    size: String,
    sku: String,
    serialNumber: String,
    description: String,
    tags: [{ type: String, lowercase: true, trim: true }],
  },

  purchaseInfo: {
    price: { amount: { type: Number, min: 0 }, currency: { type: String, default: 'USD' } },
    purchaseDate: Date,
    source: { type: String, enum: ['retail', 'resale', 'gift', 'trade', 'other'] },
    sourceName: String,
  },

  condition: {
    health: { type: Number, default: 100, min: 0, max: 100 },
    decayRate: { type: Number, default: 2, min: 0, max: 10 },
    lastDecayDate: { type: Date, default: null },
    lastMaintenanceDate: { type: Date, default: null },
    maintenanceCount: { type: Number, default: 0 },
  },
  visualLayers: [{ type: String, enum: ['dust_light', 'dust_medium', 'dust_heavy', 'yellowing'] }],
  maintenanceLogs: { type: [maintenanceLogSchema], default: [] },

  nfc: { tagId: { type: String, unique: true, sparse: true }, linkedAt: Date, scanCount: { type: Number, default: 0 } },
  marketData: {
    estimatedValue: { amount: Number, currency: { type: String, default: 'USD' } },
    benchmarkId: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketBenchmark' },
    priceDeviation: Number,
    isAnomaly: { type: Boolean, default: false },
    lastUpdated: Date,
  },

  sharing: {
    isPublic: { type: Boolean, default: false },
    shareCode: { type: String, unique: true, sparse: true },
    viewCount: { type: Number, default: 0 },
  },

  processingJobId: String,
  version: { type: Number, default: 1 },
}, { timestamps: true, toJSON: { virtuals: true } });

assetSchema.index({ 'condition.health': 1 });
assetSchema.index({ 'nfc.tagId': 1 });
assetSchema.index({ 'details.brand': 'text', 'details.model': 'text' });

assetSchema.methods.updateVisualLayers = function updateVisualLayers() {
  this.visualLayers = computeVisualLayersForHealth(this.condition.health);
  return this.visualLayers;
};

assetSchema.methods.applyDecay = function applyDecay(days = 1) {
  const decay = calculateDailyDecayAmount(this.category) * Number(days || 1);
  this.condition.health = clampHealth(this.condition.health - decay);
  this.condition.lastDecayDate = new Date();
  this.updateVisualLayers();

  return this.condition.health;
};

assetSchema.methods.performMaintenance = function performMaintenance(streakDays = 1) {
  const previousHealth = Number(this.condition.health || 0);
  const restoreAmount = calculateRestoreAmount(streakDays);

  this.condition.health = clampHealth(previousHealth + restoreAmount);
  this.condition.lastMaintenanceDate = new Date();
  this.condition.maintenanceCount += 1;
  this.updateVisualLayers();

  this.maintenanceLogs.push({
    date: new Date(),
    previousHealth,
    newHealth: this.condition.health,
    healthRestored: clampHealth(this.condition.health - previousHealth),
    xpAwarded: MAINTENANCE_XP,
  });

  return {
    newHealth: this.condition.health,
    xpAwarded: MAINTENANCE_XP,
  };
};

module.exports = mongoose.model('Asset', assetSchema);
