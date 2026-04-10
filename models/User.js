const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, default: '123456' }, // Senha padrão inicial
  role: { type: String, enum: ['player', 'admin'], default: 'player' },
  creationDate: { type: Date, default: Date.now }
}, { collection: 'users' });

module.exports = mongoose.model('User', userSchema);