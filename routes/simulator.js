var express = require('express');
var router = express.Router();
const Match = require('../models/Match');
const Tournament = require('../models/Tournament');

router.get('/', async (req, res) => {
try {
        const tournaments = await Tournament.find().sort({ startDate: -1 }).lean();
        
        // Definição de padrões seguros
        const selectedTournament = req.query.tournamentId || (tournaments.length > 0 ? tournaments[0]._id.toString() : null);
        const selectedClass = req.query.class || 'A';
        
        // 1. Busca TODOS os confrontos deste torneio e desta classe para mapear os grupos reais existentes
        const classMatches = await Match.find({ 
            tournamentId: selectedTournament, 
            className: selectedClass 
        })
        .populate('player1Id') // 👈 Traz os dados de e-mail, apelido e telefone do Player 1
        .populate('player2Id')
        .lean();

        // 2. Extrai de forma única quais grupos realmente existem para ESTA classe específica
        const groups = [...new Set(classMatches.map(m => m.groupNumber))].sort((a, b) => a - b);

        // Se nenhum grupo for selecionado na URL, pega o primeiro grupo válido desta classe
        const selectedGroup = req.query.group || (groups.length > 0 ? groups[0].toString() : '1');

        // 3. Agora sim, filtra apenas as partidas do grupo que o usuário quer simular
        const matches = classMatches.filter(m => m.groupNumber === parseInt(selectedGroup));

        // 4. Extrai a lista de jogadores únicos deste grupo específico
        const players = [...new Set(matches.flatMap(m => [m.player1Id, m.player2Id]))]
            .filter(name => name && name !== "BYE" && name !== "FOLGA");

        res.render('simulator', { 
            matches, 
            tournaments, 
            players, // Enviamos a lista limpa direto do servidor
            groups,  // Enviamos o array de grupos reais [1, 2...] em vez de um loop fixo
            selectedTournament, 
            selectedClass, 
            selectedGroup 
        });
    } catch (err) {
        console.error("Erro no Simulador:", err);
        res.status(500).send("Erro ao carregar o simulador.");
    }
});

module.exports = router;