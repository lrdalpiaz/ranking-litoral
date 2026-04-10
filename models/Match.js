const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  tournamentId: mongoose.Schema.Types.ObjectId,
  className: String, // 'A', 'B', etc.
  groupNumber: Number, // 1, 2, 3...
  player1: { type: String, required: true },
  player2: { type: String, required: true },
  player1Email: { type: String, required: true }, // Chave para permissão
  player2Email: { type: String, required: true }, // Chave para permissão
  set1: { p1: Number, p2: Number },
  set2: { p1: Number, p2: Number },
  set3: { p1: Number, p2: Number }, // Tiebreak
  round: Number,       // Semana 1, 2, 3...
  deadline: Date,      // Data final daquela semana
  played: { type: Boolean, default: false },
  date: { type: Date, default: Date.now }
}, { collection: 'matches' });

module.exports = mongoose.model('Match', matchSchema);