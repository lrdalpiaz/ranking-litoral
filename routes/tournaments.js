var express = require('express');
var router = express.Router();
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const Match = require('../models/Match');

function generateSchedule(players, startDate) {
    const schedule = [];
    if (players.length % 2 !== 0) players.push("BYE"); // Jogador fantasma para folga

    const numPlayers = players.length;
    const numRounds = numPlayers - 1;
    const half = numPlayers / 2;

    let playerList = [...players];

    for (let round = 0; round < numRounds; round++) {
        const roundDate = new Date(startDate);
        roundDate.setDate(roundDate.getDate() + (round * 7)); // Soma 7 dias por rodada

        for (let i = 0; i < half; i++) {
            const p1 = playerList[i];
            const p2 = playerList[numPlayers - 1 - i];

            if (p1 !== "BYE" && p2 !== "BYE") {
                schedule.push({
                    player1: p1,
                    player2: p2,
                    round: round + 1,
                    deadline: roundDate
                });
            }
        }
        // Rotação: mantém o primeiro, move os outros
        playerList.splice(1, 0, playerList.pop());
    }
    return schedule;
}

router.post('/create', async (req, res) => {
    try {
        const { name, startDate } = req.body;
        const tournament = await Tournament.create({ name, startDate });
        const classes = ['A', 'B', 'C', 'D', 'E'];

        for (let cls of classes) {
            const count = parseInt(req.body[`groupsCount_${cls}`]) || 0;
            
            for (let g = 1; g <= count; g++) {
                let groupPlayers = req.body[`players_${cls}_${g}`];

                if (groupPlayers) {
                    if (!Array.isArray(groupPlayers)) groupPlayers = [groupPlayers];
                    
                    // Usa sua lógica de Round Robin ou geração de Weeks aqui
                    const matches = generateSchedule(groupPlayers, startDate); 
                    
                    for (let m of matches) {
                        await Match.create({
                            tournamentId: tournament._id,
                            className: cls,
                            groupNumber: g,
                            player1: m.player1,
                            player2: m.player2,
                            round: m.round,
                            deadline: m.deadline,
                            played: false
                        });
                    }
                }
            }
        }
        res.redirect('/matches/pending');
    } catch (err) {
        res.status(500).send("Error generating tournament.");
    }
});

// Abre o formulário de criação do campeonato
router.get('/new', async (req, res) => {
    try {
        // Busca todos os jogadores cadastrados na collection 'user'
        const players = await User.find().sort({ nome: 1 });
        res.render('create-tournament', { players });
    } catch (err) {
        res.status(500).send("Erro ao carregar jogadores.");
    }
});

module.exports = router;