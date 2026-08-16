var express = require('express');
const User = require('../models/User'); // Ajuste o caminho se necessário
const Tournament = require('../models/Tournament'); // Ajuste o caminho se necessário
const Match = require('../models/Match'); // Ajuste o caminho se necessário
var router = express.Router();

// 1. TELA DE GERENCIAMENTO DE GRUPOS (Apenas Admin)
router.get('/admin/edit', async (req, res) => {
    try {
        if (!req.session.userId || req.session.role !== 'admin') {
            return res.redirect('/matches/ranking');
        }

        const { tournamentId, class: className } = req.query;

        // Busca todos os torneios ativos para alimentar o filtro do topo
        const tournaments = await Tournament.find().sort({ startDate: -1 }).lean();

        const selectedTournament = tournamentId || (tournaments[0] ? tournaments[0]._id.toString() : '');
        const selectedClass = className || 'A';

        // Coleta todos os jogadores ativos do banco para preencher os dropdowns de substitutos
        const allPlayers = await User.find({ status: 'active' }).sort({ name: 1 }).lean();

        // Descobre quem são os jogadores que já possuem partidas nesse torneio e classe
        // Buscamos as partidas para mapear quais atletas estão atualmente escalados no grupo
        const matches = await Match.find({ tournamentId: selectedTournament, className: selectedClass }).lean();

        const uniquePlayerIds = new Set();
        const currentPlayers = [];

        matches.forEach(m => {
            if (m.player1Id) uniquePlayerIds.add(m.player1Id.toString());
            if (m.player2Id) uniquePlayerIds.add(m.player2Id.toString());
        });

        // Monta a lista de jogadores que estão jogando esse grupo atualmente
        for (let id of uniquePlayerIds) {
            const player = allPlayers.find(p => p._id.toString() === id);
            if (player) currentPlayers.push(player);
        }

        res.render('edit_group', {
            title: 'Editar Grupos e Substituições',
            tournaments,
            selectedTournament,
            selectedClass,
            currentPlayers,
            allPlayers
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao carregar gerenciador de grupos.");
    }
});

// 2. API DE SUBSTITUIÇÃO EM LOTE NO BANCO DE DADOS
router.post('/admin/substitute-player', async (req, res) => {
    try {
        if (!req.session.userId || req.session.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Não autorizado.' });
        }

        const { tournamentId, className, oldPlayerId, newPlayerId } = req.body;

        if (!tournamentId || !className || !oldPlayerId || !newPlayerId) {
            return res.status(400).json({ success: false, error: 'Todos os parâmetros são obrigatórios.' });
        }

        // EFICÁCIA EM CASCATA: Atualiza todos os confrontos PENDENTES onde o jogador antigo estava escalado
        // 1. Atualiza se ele for o Player 1
        const updateP1 = await Match.updateMany(
            { tournamentId, className, player1Id: oldPlayerId, played: false },
            { $set: { player1Id: newPlayerId } }
        );

        // 2. Atualiza se ele for o Player 2
        const updateP2 = await Match.updateMany(
            { tournamentId, className, player2Id: oldPlayerId, played: false },
            { $set: { player2Id: newPlayerId } }
        );

        const totalMatchesChange = (updateP1.modifiedCount || 0) + (updateP2.modifiedCount || 0);

        // 3. Retorna a mensagem limpa com o valor unificado
        res.json({
            success: true,
            message: `Substituição concluída! Total de ${totalMatchesChange} partidas pendentes alteradas com sucesso.`
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;