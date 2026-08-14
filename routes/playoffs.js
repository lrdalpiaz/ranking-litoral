var express = require('express');
var router = express.Router();
const Match = require('../models/Match');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const { calculateStanding } = require('../public/javascripts/rankingLogic');
const { log } = require('debug/src/browser');

router.post('/lock-groups/:tournamentId', async (req, res) => {
    try {
        if (!req.session.userId || req.session.role !== 'admin') return res.status(403).send("Negado");
        
        const { tournamentId } = req.params;
        
        // 1. Busca todos os jogos do torneio para calcular as classificações reais
        const allMatches = await Match.find({ tournamentId })
            .populate('player1Id') // 👈 Traz os dados de e-mail, apelido e telefone do Player 1
            .populate('player2Id')
            .lean();
        console.log("All matches:", allMatches);
        // 2. Busca todas as estruturas de playoffs criadas que ainda não foram jogadas
        const playoffMatches = await Match.find({ tournamentId, isPlayoff: true, played: false })
            .populate('player1Id') // 👈 Traz os dados de e-mail, apelido e telefone do Player 1
            .populate('player2Id');

        console.log("Playoff matches:", playoffMatches);
        // Mapeamos os classificados por [Classe][Grupo] = [1º colocado, 2º colocado]
        const standingsCache = {};

        // 3. Para cada jogo de playoff configurado, vamos descobrir quem são os donos das vagas
        for (let pm of playoffMatches) {
            // Processa Jogador 1
            const src1 = pm.player1Source;
            if (src1 && src1.class) {
                const p1 = await getPlayerFromStanding(allMatches, src1.class, src1.groupNumber, src1.position);
                if (p1) {
                    pm.player1Id = p1.player;
                    // pm.player1 = p1.name;
                    // pm.player1Email = p1.email;
                }
            }

            // Processa Jogador 2
            const src2 = pm.player2Source;
            if (src2 && src2.class) {
                const p2 = await getPlayerFromStanding(allMatches, src2.class, src2.groupNumber, src2.position);
                if (p2) {
                    pm.player2Id = p2.player;
                    // pm.player2 = p2.name;
                    // pm.player2Email = p2.email;
                }
            }

            console.log("Saving playoff matche:", pm);
            // Salva a partida atualizada com os nomes reais no MongoDB
            await pm.save();
        }

        res.json({ success: true, message: "Playoffs atualizados com os atletas classificados!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Função auxiliar que calcula o grupo e extrai o jogador da posição desejada
async function getPlayerFromStanding(allMatches, className, groupNumber, position) {
    // CASO ESPECIAL: Repescagem de Melhores 3ºs Colocados Gerais (Códigos 101 e 102)
    if (position === 101 || position === 102) {
        // 1. Descobre quantos grupos existem nesta classe
        const classMatches = allMatches.filter(m => m.className === className);
        const groupNumbers = [...new Set(classMatches.map(m => m.groupNumber))];
        
        let allThirdPlacePlayers = [];

        // 2. Calcula a tabela de cada grupo e captura exclusivamente quem ficou em 3º lugar
        groupNumbers.forEach(grpNum => {
            const groupMatches = classMatches.filter(m => m.groupNumber === grpNum);
            const playersInGroup = [...new Set(groupMatches.flatMap(m => [m.player1Id, m.player2Id]))].filter(Boolean);
            const standing = calculateStanding(playersInGroup, groupMatches);
            
            // Se o grupo tiver pelo menos 3 jogadores, captura o 3º colocado (index 2)
            if (standing && standing[2]) {
                allThirdPlacePlayers.push(standing[2]);
            }
        });

        // 3. Ordena todos os terceiros colocados do torneio usando as mesmas regras oficiais
        // (Pontos -> Vitórias -> Saldo de Sets -> Saldo de Games)
        allThirdPlacePlayers.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.wins !== a.wins) return b.wins - a.wins;
            if ((b.sWon - b.sLost) !== (a.sWon - a.sLost)) return (b.sWon - b.sLost) - (a.sWon - a.sLost);
            return (b.gFav - b.gAg) - (a.gFav - a.gAg);
        });

        console.log("All third places:", allThirdPlacePlayers);
        // 4. Extrai o melhor (index 0 para código 101) ou o segundo melhor (index 1 para código 102)
        const targetIndex = position === 101 ? 0 : 1;
        const athlete = allThirdPlacePlayers[targetIndex];

        if (athlete) {
            const user = await User.findOne({ email: athlete.email }).lean();
            return {player: user};
        }
        return null;
    }

    // CASO REGULAR: Busca o 1º, 2º ou 3º fixo de um grupo específico (Lógica que você já tem)
    const groupMatches = allMatches.filter(m => m.className === className && m.groupNumber === groupNumber);
    const playersInGroup = [...new Set(groupMatches.flatMap(m => [m.player1Id, m.player2Id]))].filter(Boolean);
    const standing = calculateStanding(playersInGroup, groupMatches);
    
    const athlete = standing[position - 1];
    if (athlete) {
        const user = await User.findOne({ email: athlete.email }).lean();
        return {player: user};
    }
    return null;
}


// Rota para abrir o formulário de configuração (Admin)
router.get('/admin', async (req, res) => {
    try {
        if (!req.session.userId || req.session.role !== 'admin') return res.redirect('/login');
        
        const selectedTournament = req.query.tournamentId;
        const selectedClass = req.query.class || 'A';
        
        // Busca as partidas regulares para mapear os grupos reais
        const classMatches = await Match.find({ 
            tournamentId: selectedTournament, 
            className: selectedClass,
            isPlayoff: { $ne: true }
        })
        .populate('player1Id') // 👈 Traz os dados de e-mail, apelido e telefone do Player 1
        .populate('player2Id')
        .lean();

        const activeGroups = [...new Set(
            classMatches.map(m => parseInt(m.groupNumber)).filter(g => !isNaN(g) && g > 0)
        )].sort((a, b) => a - b);

        // Fallback de segurança se o torneio for novo
        if (activeGroups.length === 0) {
            activeGroups.push(1, 2, 3);
        }

        res.render('admin_playoffs', { 
            selectedTournament, 
            selectedClass,
            activeGroups 
        });
    } catch (err) {
        res.status(500).send("Erro ao carregar configurações de playoffs.");
    }
});

// Rota POST para salvar o confronto estruturado
router.post('/create', async (req, res) => {
    try {
        if (!req.session.userId || req.session.role !== 'admin') {
            return res.status(403).json({ success: false, error: "Acesso negado." });
        }

        const { tournamentId, class: className, playoffStage, p1Group, p1Pos, p2Group, p2Pos } = req.body;

        await Match.create({
            tournamentId,
            className,
            isPlayoff: true,
            playoffStage,
            played: false,
            // Guardamos a regra de quem deve ocupar esta vaga
            player1Source: { class: className, groupNumber: parseInt(p1Group), position: parseInt(p1Pos) },
            player2Source: { class: className, groupNumber: parseInt(p2Group), position: parseInt(p2Pos) },
            // Inicialmente sem nomes, até o fechamento da fase de grupos
            // player1: null,
            // player1Email: null,
            // player2: null,
            // player2Email: null
        });

        res.redirect(`/playoffs/matches?tournamentId=${tournamentId}&class=${className}`);
    } catch (err) {
        res.status(400).send("Erro ao criar confronto de playoff: " + err.message);
    }
});

router.post('/setup-bracket', async (req, res) => {
    try {
        if (!req.session.userId || req.session.role !== 'admin') return res.redirect('/login');
        
        const { tournamentId, class: className } = req.body;

        // 1. Limpa chaves antigas deste torneio/classe para não duplicar registros
        await Match.deleteMany({ tournamentId, className, isPlayoff: true });

        // Mapeamento dos 4 confrontos iniciais coletando o valor bruto do dropdown único
        const stageConfig = [
            { key: 'Q1', next: 'S1', slot: 'player1', p1Raw: req.body.q1_p1, p2Raw: req.body.q1_p2 },
            { key: 'Q2', next: 'S1', slot: 'player2', p1Raw: req.body.q2_p1, p2Raw: req.body.q2_p2 },
            { key: 'Q3', next: 'S2', slot: 'player1', p1Raw: req.body.q3_p1, p2Raw: req.body.q3_p2 },
            { key: 'Q4', next: 'S2', slot: 'player2', p1Raw: req.body.q4_p1, p2Raw: req.body.q4_p2 }
        ];

        // 2. Salva as 4 Quartas de Final destrinchando os valores de forma segura
        for (let q of stageConfig) {
            
            // Tratamento do ATLETA 1
            let g1 = 0, pos1 = parseInt(q.p1Raw);
            if (q.p1Raw && q.p1Raw.includes('-')) {
                const parts = q.p1Raw.split('-');
                g1 = parseInt(parts[0]) || 0;
                pos1 = parseInt(parts[1]) || 0;
            }

            // Tratamento do ATLETA 2
            let g2 = 0, pos2 = parseInt(q.p2Raw);
            if (q.p2Raw && q.p2Raw.includes('-')) {
                const parts = q.p2Raw.split('-');
                g2 = parseInt(parts[0]) || 0;
                pos2 = parseInt(parts[1]) || 0;
            }

            await Match.create({
                tournamentId, 
                className, 
                isPlayoff: true, 
                playoffStage: 'quartas', 
                playoffKey: q.key, 
                nextPlayoffKey: q.next, 
                nextPlayoffSlot: q.slot, 
                played: false,
                player1Source: { class: className, groupNumber: g1, position: pos1 },
                player2Source: { class: className, groupNumber: g2, position: pos2 },
                // Enviamos strings vazias explicitamente para passar pela validação antiga se necessário
                // player1: "",
                // player1Email: "",
                // player2: "",
                // player2Email: ""
            });
        }

        // 3. Cria os esqueletos das Semifinais (S1 e S2) vazios
        await Match.create({ tournamentId, className, isPlayoff: true, playoffStage: 'semifinal', playoffKey: 'S1', nextPlayoffKey: 'F1', nextPlayoffSlot: 'player1', played: false});
        await Match.create({ tournamentId, className, isPlayoff: true, playoffStage: 'semifinal', playoffKey: 'S2', nextPlayoffKey: 'F1', nextPlayoffSlot: 'player2', played: false});

        // 4. Cria o esqueleto da Grande Final (F1) vazio
        await Match.create({ tournamentId, className, isPlayoff: true, playoffStage: 'final', playoffKey: 'F1', played: false});

        res.redirect(`/playoffs/matches?tournamentId=${tournamentId}&class=${className}`);
    } catch (err) {
        console.error("Erro detalhado do Mongoose:", err);
        res.status(500).send("Erro ao montar chave estruturada: " + err.message);
    }
});

router.get('/matches', async (req, res) => {
    try {
        // 1. Busca todos os torneios cadastrados para o dropdown
        const tournaments = await Tournament.find().sort({ startDate: -1 }).lean();
        
        // Se não houver torneios, define nulo
        const selectedTournament = req.query.tournamentId || (tournaments.length > 0 ? tournaments[0]._id.toString() : null);
        const selectedClass = req.query.class || 'A';

        // 2. Filtra os playoffs do torneio e classe selecionados
        const playoffMatches = await Match.find({
            tournamentId: selectedTournament,
            className: selectedClass,
            isPlayoff: true
        })
        .populate('player1Id') // 👈 Traz os dados de e-mail, apelido e telefone do Player 1
        .populate('player2Id')
        .lean();

        const stages = {
            quartas: playoffMatches.filter(m => m.playoffStage === 'quartas'),
            semifinal: playoffMatches.filter(m => m.playoffStage === 'semifinal'),
            final: playoffMatches.filter(m => m.playoffStage === 'final')
        };

        // 3. Envia os torneios e o selecionado para o Pug
        res.render('playoffs', { 
            stages, 
            tournaments, 
            selectedTournament, 
            selectedClass 
        });
    } catch (err) {
        res.status(500).send("Erro ao carregar chave de playoffs");
    }
});

module.exports = router;
