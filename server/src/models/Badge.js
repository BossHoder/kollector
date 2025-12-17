[cite_start]// [cite: 4938-4995]
const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true }, // VD: NIKE_GOD
  name: { type: String, required: true },
  description: String,
  iconUrl: String,
  category: { type: String, enum: ['collection', 'maintenance', 'social', 'achievement'], default: 'achievement' },
  rarity: { type: String, enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'], default: 'common' },
  xpReward: { type: Number, default: 50 },
  
  // Điều kiện để mở khóa (Logic này sẽ check trong code)
  unlockCriteria: {
    type: { type: String, enum: ['item_count', 'net_worth', 'cleaning_streak', 'total_cleanings', 'category_master'] },
    value: Number,
    category: String // Dùng cho loại category_master
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Badge', badgeSchema);