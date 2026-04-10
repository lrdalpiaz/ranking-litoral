var express = require('express');
var router = express.Router();
const Match = require('../models/Match');
const Tournament = require('../models/Tournament');

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
        const { s1p1, s1p2, s2p1, s2p2, s3p1, s3p2 } = req.body;
        const match = await Match.findById(req.params.id);
        const currentUserEmail = req.session.userEmail;
      
        const isOwner = currentUserEmail === match.player1Email || currentUserEmail === match.player2Email;
        const isAdmin = req.session.role === 'admin';
      
        if (!isOwner && !isAdmin) {
          return res.status(403).json({ error: 'Acesso negado' });
        }
        await Match.findByIdAndUpdate(req.params.id, {
            set1: { p1: Number(s1p1), p2: Number(s1p2) },
            set2: { p1: Number(s2p1), p2: Number(s2p2) },
            set3: { p1: Number(s3p1) || 0, p2: Number(s3p2) || 0 },
            played: true
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


router.get('/ranking', async (req, res) => {
    try {
        // 1. Busca apenas jogos que já possuem resultado (played: true)
        const matches = await Match.find({ played: true });

        // Estrutura para armazenar os dados: { 'A': { '1': { 'Jogador': { stats } } } }
        const tournamentData = {};

        matches.forEach(m => {
            const { className, groupNumber, player1, player2, set1, set2, set3 } = m;

            // Inicializa estrutura se não existir
            if (!tournamentData[className]) tournamentData[className] = {};
            if (!tournamentData[className][groupNumber]) tournamentData[className][groupNumber] = {};

            const group = tournamentData[className][groupNumber];

            [player1, player2].forEach(name => {
                if (!group[name]) {
                    group[name] = {
                        name, points: 0, wins: 0, losses: 0,
                        setsWon: 0, setsLost: 0, gFavor: 0, gAgainst: 0,
                        matchesAgainst: {} // Para conferir confronto direto
                    };
                }
            });

            const p1 = group[player1];
            const p2 = group[player2];

            // Cálculo de Games (Apenas Sets 1 e 2)
            p1.gFavor += (set1.p1 + set2.p1);
            p1.gAgainst += (set1.p2 + set2.p2);
            p2.gFavor += (set1.p2 + set2.p2);
            p2.gAgainst += (set1.p1 + set2.p1);

            // Cálculo de Sets (Sets 1 e 2 são normais)
            let s1 = (set1.p1 > set1.p2 ? 1 : 0) + (set2.p1 > set2.p2 ? 1 : 0);
            let s2 = (set1.p2 > set1.p1 ? 1 : 0) + (set2.p2 > set2.p1 ? 1 : 0);

            // Lógica de Pontuação e Tiebreak (Set 3)
            if (s1 === 2) { // 2-0 J1
                p1.points += 3; p1.wins++; p2.losses++;
                p1.setsWon += 2; p2.setsLost += 2;
                p1.matchesAgainst[player2] = 'win';
            } else if (s2 === 2) { // 2-0 J2
                p2.points += 3; p2.wins++; p1.losses++;
                p2.setsWon += 2; p1.setsLost += 2;
                p1.matchesAgainst[player2] = 'loss';
            } else {
                // Empate 1-1 -> Decisão no Tiebreak (Set 3)
                // Tiebreak conta como Set, mas no Saldo de Games vale apenas 1 ponto
                if (set3.p1 > set3.p2) { // 2-1 J1
                    p1.points += 2; p2.points += 1;
                    p1.wins++; p2.losses++;
                    p1.setsWon += 2; p1.setsLost += 1;
                    p2.setsWon += 1; p2.setsLost += 2;
                    p1.gFavor += 1;
                    p1.matchesAgainst[player2] = 'win';
                } else { // 2-1 J2
                    p2.points += 2; p1.points += 1;
                    p2.wins++; p1.losses++;
                    p2.setsWon += 2; p2.setsLost += 1;
                    p1.setsWon += 1; p1.setsLost += 2;
                    p2.gFavor += 1;
                    p1.matchesAgainst[player2] = 'loss';
                }
            }
        });

        // 2. Ordenação de cada grupo seguindo todos os critérios
        for (let cls in tournamentData) {
            for (let gNum in tournamentData[cls]) {
                const athletes = Object.values(tournamentData[cls][gNum]);

                athletes.sort((a, b) => {
                    // Critério 1: Pontos
                    if (b.points !== a.points) return b.points - a.points;

                    // Critério 2: Confronto Direto (Se apenas 2 empatados)
                    const tied = athletes.filter(p => p.points === a.points);
                    if (tied.length === 2) {
                        if (a.matchesAgainst[b.name] === 'win') return -1;
                        if (a.matchesAgainst[b.name] === 'loss') return 1;
                    }

                    // Critério 3: Vitórias
                    if (b.wins !== a.wins) return b.wins - a.wins;

                    // Critério 4: Saldo de Sets
                    const aSetBalance = a.setsWon - a.setsLost;
                    const bSetBalance = b.setsWon - b.setsLost;
                    if (bSetBalance !== aSetBalance) return bSetBalance - aSetBalance;

                    // Critério 5: Saldo de Games (Incluindo bônus de tiebreak)
                    const aGameBalance = a.gFavor - a.gAgainst;
                    const bGameBalance = b.gFavor - b.gAgainst;
                    if (bGameBalance !== aGameBalance) return bGameBalance - aGameBalance;

                    // Critério 6: Aleatório (Sorte)
                    return 0.5 - Math.random();
                });

                tournamentData[cls][gNum] = athletes;
            }
        }

        res.render('ranking', { tournamentData });
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro ao processar o ranking: " + err.message);
    }
});


module.exports = router;
