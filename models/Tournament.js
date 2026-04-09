const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  name: String,
  startDate: Date,
  classes: [{
    className: { type: String, enum: ['A', 'B', 'C', 'D', 'E'] },
    groups: [{
      groupNumber: Number,
      players: [String] // Lista de nomes dos jogadores no grupo
    }]
  }],
  status: { type: String, default: 'Active' }
});

module.exports = mongoose.model('Tournament', tournamentSchema);