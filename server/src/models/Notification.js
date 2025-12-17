[cite_start]// [cite: 5141-5189]
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { 
    type: String, 
    enum: ['asset_processed', 'asset_failed', 'maintenance_reminder', 'badge_unlocked', 'market_alert', 'system'], 
    required: true 
  },
  title: { type: String, required: true },
  body: { type: String, required: true },
  
  // Dữ liệu để Deep Link (bấm vào nhảy tới đúng màn hình)
  data: {
    assetId: mongoose.Schema.Types.ObjectId,
    badgeId: mongoose.Schema.Types.ObjectId,
    screen: String
  },
  
  isRead: { type: Boolean, default: false },
  pushSent: { type: Boolean, default: false }
}, { timestamps: true });

// Tự xóa sau 90 ngày
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('Notification', notificationSchema);