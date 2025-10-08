const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  groupId: { type: String, required: true, unique: true },
  prefix: { type: String, default: '/' },
  createdAt: { type: Date, default: Date.now },
});

const Group = mongoose.model('Group', groupSchema);
module.exports = Group;