const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: { type: String, required: true, unique: true },
  username: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  createdAt: { type: Date, default: Date.now },
  lastInteraction: { type: Date, default: Date.now },
  commandCount: { type: Number, default: 0 },


  wallet: { type: Number, default: 0 },
  bank: { type: Number, default: 0 },
  loan: { type: Number, default: 0 },


  lastDailyWork: { type: Date, default: null },


  xp: { type: Number, default: 0 },
  currentXP: { type: Number, default: 0 },
  requiredXP: { type: Number, default: 100 },
  level: { type: Number, default: 1 },
  rank: { type: Number, default: 0 },


  achievements: [{ type: String }],
  inventory: [{
    itemId: String,
    amount: { type: Number, default: 1 }
  }],
  isPremium: { type: Boolean, default: false },
  premiumExpires: { type: Date, default: null },
  ban: { type: Boolean, default: false },
  banReason: { type: String },
  language: { type: String, default: "en" },
  referrer: { type: String },
  referrals: [{ type: String }],
  settings: { type: Object, default: {} },
  cooldowns: { type: Object, default: {} },
  lastActiveGroup: { type: String }
});

const User = mongoose.model('User', userSchema);
module.exports = User;