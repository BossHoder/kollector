[cite_start]// [cite: 4996-5015]
const mongoose = require('mongoose');

const badgeUnlockSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  badgeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Badge', required: true },
  unlockedAt: { type: Date, default: Date.now },
  triggerEvent: String // Sự kiện gì kích hoạt (VD: 'clean_asset')
}, { timestamps: true });

badgeUnlockSchema.index({ userId: 1, badgeId: 1 }, { unique: true }); // Mỗi huy hiệu chỉ nhận 1 lần

module.exports = mongoose.model('BadgeUnlock', badgeUnlockSchema);