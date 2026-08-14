const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true },
  password: { type: String, default: '123456' }, // Senha padrão inicial
  fullName: { type: String, required: true },
  nickname: { type: String, required: false, default: "" },
  phone: { type: String, required: true },
  role: { type: String, enum: ['player', 'admin'], default: 'player' },
  status: {
    type: String,
    enum: ['active', 'pending', 'rejected'],
    default: 'active' // Usuários antigos continuam ativos por padrão
  },
  creationDate: { type: Date, default: Date.now }
}, { collection: 'users' });

module.exports = mongoose.model('User', userSchema);