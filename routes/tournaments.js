var express = require('express');
var router = express.Router();
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const Match = require('../models/Match');

function generateSchedule(players, startDate) {
    const schedule = [];
    let playerList = [...players];
    
    // Adiciona um objeto "Folga" se for ímpar
    if (playerList.length % 2 !== 0) {
        playerList.push({ name: "BYE", email: "bye@null.com" });
    }

    const numPlayers = playerList.length;
    const numRounds = numPlayers - 1;
    const half = numPlayers / 2;

    for (let round = 1; round <= numRounds; round++) {
        const roundDate = new Date(startDate);
        roundDate.setDate(roundDate.getDate() + (round * 7));

        for (let i = 0; i < half; i++) {
            const p1 = playerList[i];
            const p2 = playerList[numPlayers - 1 - i];

            // Só cria a partida se nenhum dos dois for a folga (BYE)
            if (p1.name !== "BYE" && p2.name !== "BYE") {
                schedule.push({
                    player1: p1, // Agora é o objeto completo do User
                    player2: p2, // Agora é o objeto completo do User
                    round: round,
                    deadline: roundDate
                });
            }
        }
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
                let emailsArr = req.body[`players_${cls}_${g}`];

                if (emailsArr) {
                    if (!Array.isArray(emailsArr)) emailsArr = [emailsArr];

                    // BUSCA POR E-MAIL (Muito mais seguro)
                    const playersData = await User.find({ email: { $in: emailsArr } });

                    // Gera as rodadas enviando os objetos completos
                    const matches = generateSchedule(playersData, startDate); 
                    
                    for (let m of matches) {
                        await Match.create({
                            tournamentId: tournament._id,
                            className: cls,
                            groupNumber: g,
                            player1: m.player1.name,
                            player1Email: m.player1.email,
                            player2: m.player2.name,
                            player2Email: m.player2.email,
                            round: m.round,
                            deadline: m.deadline,
                            played: false
                        });
                    }
                }
            }
        }
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// Abre o formulário de criação do campeonato
router.get('/new', async (req, res) => {
    try {
        // Busca todos os jogadores cadastrados na collection 'user'
        const players = await User.find().sort({ name: 1 });
        res.render('create-tournament', { players });
    } catch (err) {
        res.status(500).send("Erro ao carregar jogadores.");
    }
});

module.exports = router;