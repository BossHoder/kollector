[cite_start]// [cite: 5017-5072]
const mongoose = require('mongoose');

const marketBenchmarkSchema = new mongoose.Schema({
  sku: { type: String, unique: true, sparse: true, uppercase: true },
  name: { type: String, required: true, index: 'text' }, // Index text để search nhanh
  category: { type: String, enum: ['sneaker', 'lego', 'camera', 'other'], required: true },
  
  pricing: {
    avgPrice: { type: Number, required: true },
    minPrice: Number,
    maxPrice: Number,
    currency: { type: String, default: 'USD' },
    lastUpdated: { type: Date, default: Date.now }
  },
  
  imageUrl: String,
  aliases: [String], // Tên gọi khác (VD: "Jordan 1 Chicago" còn gọi là "Lost and Found")
  confidence: { type: Number, default: 0.5 } // Độ tin cậy của dữ liệu
}, { timestamps: true });

module.exports = mongoose.model('MarketBenchmark', marketBenchmarkSchema);