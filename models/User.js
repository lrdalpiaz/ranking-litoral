const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  criadoEm: { type: Date, default: Date.now }
}, { collection: 'users' });

module.exports = mongoose.model('User', userSchema);
