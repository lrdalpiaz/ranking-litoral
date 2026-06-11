var express = require('express');
var router = express.Router();
const Match = require('../models/Match');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const { calculateStanding } = require('../public/javascripts/rankingLogic');
const { log } = require('debug/src/browser');

router.get('/pending', async (req, res) => {
    try {
        const { tournamentId, class: qClass, group: qGroup } = req.query;
        
        // 1. Busca todos os torneios para o filtro
        const tournaments = await Tournament.find().sort({ startDate: -1 });
        
        // 2. Define o Torneio padrão (o mais recente) se nenhum for selecionado
        const selectedTournament = tournamentId || (tournaments[0] ? tournaments[0]._id.toString() : null);
        const selectedClass = qClass || 'A';
        const selectedGroup = qGroup || '1';

        let query= {}; // Ou remova para ver todos, como fizemos antes
        if (selectedTournament) query.tournamentId = selectedTournament;
        if (selectedClass) query.className = selectedClass;
        if (selectedGroup) query.groupNumber = parseInt(selectedGroup);

        const matches = await Match.find(query).sort({ round: 1, className: 1, groupNumber: 1 });

        res.render('pending_matches', { 
            matches, 
            tournaments,
            selectedTournament,
            selectedClass, 
            selectedGroup 
        });
    } catch (err) {
        res.status(500).send("Erro ao filtrar jogos.");
    }
});

router.get('/filter', async (req, res) => {
    try {
        const { tournamentId, class: qClass, group: qGroup } = req.query;
        let query = { 
            tournamentId, 
            className: qClass, 
            groupNumber: parseInt(qGroup) 
        };
        console.log(query);
        
        const matches = await Match.find(query).sort({ round: 1 });
        // Retornamos os dados e o usuário logado para controle de permissão no front
        res.json({ 
            matches, 
            user: req.session.userEmail ? { email: req.session.userEmail, role: req.session.role } : null 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Abre o formulário de placar para um jogo específico
router.get('/score/:id', async (req, res) => {
    try {
        const match = await Match.findById(req.params.id).lean();
        if (!match) return res.status(404).send("Match not found");

        res.render('update-match', { match });
    } catch (err) {
        res.status(500).send("Error loading match data.");
    }
});

router.post('/update/:id', async (req, res) => {
    try {
        const matchId = req.params.id;
        
        // 1. Captura os dados do formulário (converta para número para não dar NaN)
        const s1p1 = parseInt(req.body.s1p1) || 0;
        const s1p2 = parseInt(req.body.s1p2) || 0;
        const s2p1 = parseInt(req.body.s2p1) || 0;
        const s2p2 = parseInt(req.body.s2p2) || 0;
        const s3p1 = parseInt(req.body.s3p1) || 0;
        const s3p2 = parseInt(req.body.s3p2) || 0;

        // 2. Atualiza a partida atual no banco de dados
        const match = await Match.findByIdAndUpdate(matchId, {
            set1: { p1: s1p1, p2: s1p2 },
            set2: { p1: s2p1, p2: s2p2 },
            set3: { p1: s3p1, p2: s3p2 },
            played: true
        }, { new: true });

        if (!match) return res.status(404).send("Partida não encontrada.");

        // =====================================================================
        // MOTOR DE AVANÇO AUTOMÁTICO (EFEITO DOMINÓ DOS PLAYOFFS)
        // =====================================================================
        if (match.isPlayoff && match.nextPlayoffKey) {
            // Lógica oficial de tênis para descobrir o vencedor da partida
            const setsP1 = (s1p1 > s1p2 ? 1 : 0) + (s2p1 > s2p2 ? 1 : 0);
            const setsP2 = (s1p2 > s1p1 ? 1 : 0) + (s2p2 > s2p1 ? 1 : 0);
            
            let winnerName = "";
            let winnerEmail = "";

            // Verifica vitória direta por 2-0 ou decisão por Super Tie-break no 3º set
            if (setsP1 === 2 || (setsP1 === 1 && setsP2 === 1 && s3p1 > s3p2)) {
                winnerName = match.player1;
                winnerEmail = match.player1Email;
            } else {
                winnerName = match.player2;
                winnerEmail = match.player2Email;
            }

            // Prepara a query dinâmica para injetar no slot correto (player1 ou player2) da próxima fase
            const updateNextStageQuery = {};
            if (match.nextPlayoffSlot === 'player1') {
                updateNextStageQuery.player1 = winnerName;
                updateNextStageQuery.player1Email = winnerEmail;
            } else {
                updateNextStageQuery.player2 = winnerName;
                updateNextStageQuery.player2Email = winnerEmail;
            }

            // Atualiza o próximo jogo da árvore (Ex: se completou Q1, atualiza S1)
            await Match.updateOne({
                tournamentId: match.tournamentId,
                className: match.className,
                playoffKey: match.nextPlayoffKey,
                isPlayoff: true
            }, updateNextStageQuery);
        }

        // =====================================================================
        // REDIRECIONAMENTO INTELIGENTE (FIM DO JSON NA TELA)
        // =====================================================================
        if (match.isPlayoff) {
            // Se for jogo de mata-mata, volta para a tela de chaves mantendo os filtros acesos
            return res.redirect(`/playoffs/matches?tournamentId=${match.tournamentId}&class=${match.className}`);
        } else {
            // Se for jogo da fase de grupos comum, volta para a agenda padrão do torneio
            const urlParams = new URLSearchParams(req.headers.referer ? new URL(req.headers.referer).search : "");
            const activeGroup = urlParams.get('group') || match.groupNumber || "1";
            return res.redirect(`/matches/pending?tournamentId=${match.tournamentId}&class=${match.className}&group=${activeGroup}`);
        }

    } catch (err) {
        console.error("Erro ao salvar placar:", err);
        res.status(500).send("Erro interno ao atualizar os resultados.");
    }
});


router.get('/ranking', async (req, res) => {
    try {
        // 1. Busca todas as temporadas para preencher o seletor
        const tournaments = await Tournament.find().sort({ startDate: -1 }).lean();
        
        // Se não houver torneio na URL, pega o mais recente como padrão
        const selectedTournament = req.query.tournamentId || (tournaments.length > 0 ? tournaments[0]._id.toString() : null);

        // 2. Busca apenas as partidas vinculadas ao torneio selecionado (sempre com .lean())
        const allMatches = await Match.find({ tournamentId: selectedTournament }).lean();
        const tournamentData = {};

        // 3. Organiza as partidas por Classe e depois por Grupo
        allMatches.forEach(m => {
            // Ignora partidas que não possuem classe ou grupo definidos no banco
            if (!m.className || !m.groupNumber) return;

            if (!tournamentData[m.className]) tournamentData[m.className] = {};
            if (!tournamentData[m.className][m.groupNumber]) {
                tournamentData[m.className][m.groupNumber] = [];
            }
            tournamentData[m.className][m.groupNumber].push(m);
        });

        // 4. Processa o Ranking para cada Grupo individualmente
        for (let cls in tournamentData) {
            for (let grp in tournamentData[cls]) {
                const matchesOfGroup = tournamentData[cls][grp];
                
                // Extrai atletas únicos filtrando valores nulos, vazios ou folgas (BYE)
                const playersInGroup = [...new Set(
                    matchesOfGroup.flatMap(m => [m.player1, m.player2])
                )].filter(name => name && name !== "BYE" && name !== "FOLGA");
                
                // Executa o motor de cálculo apenas se houver jogadores no grupo
                if (playersInGroup.length > 0) {
                    tournamentData[cls][grp] = calculateStanding(playersInGroup, matchesOfGroup);
                } else {
                    tournamentData[cls][grp] = [];
                }
            }
        }

        // 5. Garante que as classes padrão existam no objeto para o Pug não dar erro de loop
        ['A', 'B', 'C', 'D', 'E'].forEach(cls => {
            if (!tournamentData[cls]) tournamentData[cls] = {};
        });

        // 6. Envia todas as variáveis para o Pug
        res.render('ranking', { 
            tournamentData, 
            tournaments, 
            selectedTournament 
        });
    } catch (err) {
        console.error("Erro no processamento do Ranking:", err);
        res.status(500).send("Erro interno ao processar a tabela de classificação.");
    }
});

module.exports = router;
