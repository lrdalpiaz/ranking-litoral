const mongoose = require('mongoose');
const Match = require('./models/Match'); // Certifique-se de que o caminho está correto
require('dotenv').config();

const players = ["Guga Kuerten", "Roger Federer", "Rafael Nadal", "Novak Djokovic", "Carlos Alcaraz", "Jannik Sinner"];

const testMatches = [
  // Rodada 1
  { player1: players[0], player2: players[1], set1: { p1: 6, p2: 4 }, set2: { p1: 6, p2: 3 }, set3: { p1: 0, p2: 0 } }, // 2-0 (3 pts Guga)
  { player1: players[2], player2: players[3], set1: { p1: 6, p2: 7 }, set2: { p1: 6, p2: 2 }, set3: { p1: 10, p2: 8 } }, // 2-1 (2 pts Nadal, 1 Djoko)
  { player1: players[4], player2: players[5], set1: { p1: 6, p2: 1 }, set2: { p1: 6, p2: 4 }, set3: { p1: 0, p2: 0 } }, // 2-0 (3 pts Alcaraz)
  
  // Rodada 2
  { player1: players[0], player2: players[2], set1: { p1: 4, p2: 6 }, set2: { p1: 3, p2: 6 }, set3: { p1: 0, p2: 0 } }, // 0-2 (3 pts Nadal)
  { player1: players[1], player2: players[4], set1: { p1: 6, p2: 2 }, set2: { p1: 6, p2: 7 }, set3: { p1: 7, p2: 10 } }, // 1-2 (2 pts Alcaraz, 1 Federer)
  { player1: players[3], player2: players[5], set1: { p1: 6, p2: 0 }, set2: { p1: 6, p2: 0 }, set3: { p1: 0, p2: 0 } }, // 2-0 (3 pts Djoko)

  // Rodada 3
  { player1: players[0], player2: players[3], set1: { p1: 6, p2: 4 }, set2: { p1: 2, p2: 6 }, set3: { p1: 10, p2: 5 } }, // 2-1 (2 pts Guga, 1 Djoko)
  { player1: players[1], player2: players[5], set1: { p1: 6, p2: 4 }, set2: { p1: 6, p2: 4 }, set3: { p1: 0, p2: 0 } }, // 2-0 (3 pts Federer)
  { player1: players[2], player2: players[4], set1: { p1: 7, p2: 5 }, set2: { p1: 6, p2: 2 }, set3: { p1: 0, p2: 0 } }, // 2-0 (3 pts Nadal)

  // Rodada 4
  { player1: players[0], player2: players[4], set1: { p1: 3, p2: 6 }, set2: { p1: 2, p2: 6 }, set3: { p1: 0, p2: 0 } }, // 0-2 (3 pts Alcaraz)
  { player1: players[1], player2: players[3], set1: { p1: 2, p2: 6 }, set2: { p1: 4, p2: 6 }, set3: { p1: 0, p2: 0 } }, // 0-2 (3 pts Djoko)
  { player1: players[2], player2: players[5], set1: { p1: 6, p2: 3 }, set2: { p1: 5, p2: 7 }, set3: { p1: 10, p2: 4 } }, // 2-1 (2 pts Nadal, 1 Sinner)

  // Rodada 5
  { player1: players[0], player2: players[5], set1: { p1: 6, p2: 1 }, set2: { p1: 6, p2: 2 }, set3: { p1: 0, p2: 0 } }, // 2-0 (3 pts Guga)
  { player1: players[1], player2: players[2], set1: { p1: 3, p2: 6 }, set2: { p1: 2, p2: 6 }, set3: { p1: 0, p2: 0 } }, // 0-2 (3 pts Nadal)
  { player1: players[3], player2: players[4], set1: { p1: 6, p2: 7 }, set2: { p1: 6, p2: 4 }, set3: { p1: 5, p2: 10 } }, // 1-2 (2 pts Alcaraz, 1 Djoko)
];

async function seedDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to Atlas to seed data...");
    
    // Opcional: Limpar partidas antigas antes de inserir
    // await Match.deleteMany({}); 

    await Match.insertMany(testMatches);
    console.log("Successfully inserted 15 matches!");
    
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seedDB();
