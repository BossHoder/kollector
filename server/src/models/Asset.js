[cite_start]// [cite: 4579-4932]
const mongoose = require('mongoose');

// --- Sub-schemas ---
const visualLayerSchema = new mongoose.Schema({
  type: { type: String, enum: ['dust_light', 'dust_medium', 'dust_heavy', 'yellowing', 'scratches'], required: true },
  intensity: { type: Number, min: 0, max: 1, default: 0.5 },
  appliedAt: { type: Date, default: Date.now }
}, { _id: false });

const maintenanceLogSchema = new mongoose.Schema({
  action: { type: String, enum: ['clean', 'restore', 'decay', 'manual_adjust'], required: true },
  previousHealth: { type: Number, required: true },
  newHealth: { type: Number, required: true },
  xpAwarded: { type: Number, default: 0 },
  note: String,
  performedAt: { type: Date, default: Date.now }
}, { _id: true });

// --- Main Schema ---
const assetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  category: { type: String, enum: ['sneaker', 'lego', 'camera', 'other'], required: true, index: true },
  status: { type: String, enum: ['draft', 'processing', 'partial', 'active', 'archived'], default: 'draft', index: true },

  // --- IMAGES ---
  images: {
    original: { url: { type: String, required: true }, publicId: String, uploadedAt: { type: Date, default: Date.now } },
    processed: { url: String, publicId: String, processedAt: Date }, // Ảnh xóa phông
    thumbnail: { url: String, publicId: String },
    card: { url: String, generatedAt: Date, expiresAt: Date } // Ảnh thẻ FIFA
  },

  // --- AI METADATA ---
  aiMetadata: {
    brand: { value: String, confidence: Number },
    model: { value: String, confidence: Number },
    colorway: { value: String, confidence: Number },
    estimatedYear: { value: Number, confidence: Number },
    conditionNotes: String,
    rawResponse: String,
    processedAt: Date
  },

  // --- MANUAL DETAILS ---
  details: {
    brand: { type: String, trim: true },
    model: { type: String, trim: true },
    colorway: { type: String, trim: true },
    size: String,
    sku: String,
    serialNumber: String,
    description: String,
    tags: [{ type: String, lowercase: true, trim: true }]
  },

  // --- PURCHASE INFO ---
  purchaseInfo: {
    price: { amount: { type: Number, min: 0 }, currency: { type: String, default: 'USD' } },
    purchaseDate: Date,
    source: { type: String, enum: ['retail', 'resale', 'gift', 'trade', 'other'] },
    sourceName: String
  },

  // --- CONDITION & GAMIFICATION (TAMAGOTCHI) ---
  condition: {
    health: { type: Number, default: 100, min: 0, max: 100 },
    decayRate: { type: Number, default: 2, min: 0, max: 10 }, // 2% mỗi ngày
    lastDecayDate: { type: Date, default: Date.now },
    lastMaintenanceDate: Date,
    maintenanceCount: { type: Number, default: 0 }
  },
  visualLayers: [visualLayerSchema], // Lớp bụi
  maintenanceLogs: { type: [maintenanceLogSchema], default: [] },

  // --- NFC & MARKET ---
  nfc: { tagId: { type: String, unique: true, sparse: true }, linkedAt: Date, scanCount: { type: Number, default: 0 } },
  marketData: {
    estimatedValue: { amount: Number, currency: { type: String, default: 'USD' } },
    benchmarkId: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketBenchmark' },
    priceDeviation: Number,
    isAnomaly: { type: Boolean, default: false },
    lastUpdated: Date
  },

  // --- SHARING ---
  sharing: {
    isPublic: { type: Boolean, default: false },
    shareCode: { type: String, unique: true, sparse: true },
    viewCount: { type: Number, default: 0 }
  },
  
  processingJobId: String, // BullMQ Job ID
  version: { type: Number, default: 1 } // Optimistic locking
}, { timestamps: true, toJSON: { virtuals: true } });

// --- INDEXES ---
assetSchema.index({ 'condition.health': 1 }); // Để Cronjob quét món đồ sắp hỏng
assetSchema.index({ 'nfc.tagId': 1 }); // Để quét NFC
assetSchema.index({ 'details.brand': 'text', 'details.model': 'text' }); // Search

// --- METHODS (LOGIC) ---
assetSchema.methods.applyDecay = function(days = 1) {
  const categoryModifiers = { sneaker: 1.5, lego: 0.8, camera: 1.2, other: 1.0 };
  const modifier = categoryModifiers[this.category] || 1.0;
  const decay = this.condition.decayRate * modifier * days;
  
  const previousHealth = this.condition.health;
  this.condition.health = Math.max(0, this.condition.health - decay);
  this.condition.lastDecayDate = new Date();
  
  // Logic cập nhật lớp bụi dựa trên máu
  this.updateVisualLayers();
  
  this.maintenanceLogs.push({
    action: 'decay',
    previousHealth,
    newHealth: this.condition.health,
    note: `Auto decay: -${decay.toFixed(1)}%`
  });
  return this.condition.health;
};

assetSchema.methods.updateVisualLayers = function() {
  const health = this.condition.health;
  this.visualLayers = [];
  if (health < 80 && health >= 60) this.visualLayers.push({ type: 'dust_light', intensity: 0.2 });
  else if (health < 60 && health >= 40) this.visualLayers.push({ type: 'dust_medium', intensity: 0.4 });
  else if (health < 40 && health >= 20) this.visualLayers.push({ type: 'dust_heavy', intensity: 0.6 });
  else if (health < 20) {
    this.visualLayers.push({ type: 'dust_heavy', intensity: 0.8 });
    this.visualLayers.push({ type: 'yellowing', intensity: 0.3 });
  }
};

assetSchema.methods.performMaintenance = function(streakBonus = 0) {
  const previousHealth = this.condition.health;
  const baseRestore = 25;
  const restore = Math.min(baseRestore + streakBonus, 40);
  
  this.condition.health = Math.min(100, this.condition.health + restore);
  this.condition.lastMaintenanceDate = new Date();
  this.condition.maintenanceCount += 1;
  this.visualLayers = []; // Sạch bong
  
  const xpAwarded = 10 + Math.floor(streakBonus / 5);
  
  this.maintenanceLogs.push({
    action: 'clean',
    previousHealth,
    newHealth: this.condition.health,
    xpAwarded,
    note: `Restored +${restore}% (streak bonus: ${streakBonus}%)`
  });
  
  return { newHealth: this.condition.health, xpAwarded };
};

module.exports = mongoose.model('Asset', assetSchema);