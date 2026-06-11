const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  tournamentId: mongoose.Schema.Types.ObjectId,
  className: String, // 'A', 'B', etc.
  groupNumber: Number, // 1, 2, 3...
  player1: { type: String, required: false, default: null },
  player1Email: { type: String, required: false, default: null },
  player2: { type: String, required: false, default: null },
  player2Email: { type: String, required: false, default: null },
  set1: { p1: Number, p2: Number },
  set2: { p1: Number, p2: Number },
  set3: { p1: Number, p2: Number }, // Tiebreak
  round: Number,       // Semana 1, 2, 3...
  deadline: Date,      // Data final daquela semana
  played: { type: Boolean, default: false },
  date: { type: Date, default: Date.now },
  
  isPlayoff: { type: Boolean, default: false },
  playoffStage: { type: String, enum: ['quartas', 'semifinal', 'final'], default: null },
  
  // Identificadores da árvore (Ex: 'Q1', 'Q2', 'S1', 'F1')
  playoffKey: { type: String, default: null },
  nextPlayoffKey: { type: String, default: null }, // Para onde vai o vencedor
  nextPlayoffSlot: { type: String, enum: ['player1', 'player2'], default: null }, // Entra como player1 ou player2?

  player1Source: { class: String, groupNumber: Number, position: Number },
  player2Source: { class: String, groupNumber: Number, position: Number }
}, { collection: 'matches' });

module.exports = mongoose.model('Match', matchSchema);