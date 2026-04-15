var express = require('express');
var router = express.Router();
const Match = require('../models/Match');
const Tournament = require('../models/Tournament');

router.get('/', async (req, res) => {
    try {
        const { tournamentId, class: qClass, group: qGroup } = req.query;
        const tournaments = await Tournament.find().sort({ startDate: -1 });
        
        const selectedTournament = tournamentId || (tournaments[0] ? tournaments[0]._id.toString() : null);
        const selectedClass = qClass || 'A';
        const selectedGroup = qGroup || '1';

        // Buscamos TODOS os jogos (jogados ou não) para o simulador
        const matches = await Match.find({ 
            tournamentId: selectedTournament, 
            className: selectedClass, 
            groupNumber: parseInt(selectedGroup) 
        }).sort({ round: 1 });

        res.render('simulator', { 
            matches, tournaments, selectedTournament, selectedClass, selectedGroup 
        });
    } catch (err) {
        res.status(500).send("Erro ao carregar simulador.");
    }
});

module.exports = router;