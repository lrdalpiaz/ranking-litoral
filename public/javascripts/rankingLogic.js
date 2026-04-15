const calculateStanding = (players, matches) => {
    const stats = {};
    players.forEach(p => {
        stats[p] = { name: p, points: 0, wins: 0, sWon: 0, sLost: 0, gFav: 0, gAg: 0 };
    });

    // Filtra apenas jogos que tenham algum resultado
    const playedMatches = matches.filter(m => {
        // Suporta m.set1.p1 (banco) ou m.s1p1 (simulador/forms)
        const s1p1 = m.set1 ? m.set1.p1 : (m.s1p1 || 0);
        const s1p2 = m.set1 ? m.set1.p2 : (m.s1p2 || 0);
        return (parseInt(s1p1) + parseInt(s1p2)) > 0;
    });

    playedMatches.forEach(m => {
        const { player1: p1, player2: p2 } = m;
        
        // Normalização dos valores para garantir que sejam números
        const s1p1 = parseInt(m.set1 ? m.set1.p1 : m.s1p1) || 0;
        const s1p2 = parseInt(m.set1 ? m.set1.p2 : m.s1p2) || 0;
        const s2p1 = parseInt(m.set2 ? m.set2.p1 : m.s2p1) || 0;
        const s2p2 = parseInt(m.set2 ? m.set2.p2 : m.s2p2) || 0;
        const s3p1 = parseInt(m.set3 ? m.set3.p1 : m.s3p1) || 0;
        const s3p2 = parseInt(m.set3 ? m.set3.p2 : m.s3p2) || 0;

        stats[p1].gFav += (s1p1 + s2p1); stats[p1].gAg += (s1p2 + s2p2);
        stats[p2].gFav += (s1p2 + s2p2); stats[p2].gAg += (s1p1 + s2p1);

        const p1Set1 = s1p1 > s1p2;
        const p1Set2 = s2p1 > s2p2;
        const setsP1 = (p1Set1 ? 1 : 0) + (p1Set2 ? 1 : 0);
        const setsP2 = (!p1Set1 ? 1 : 0) + (!p1Set2 ? 1 : 0);

        if (setsP1 === 2) {
            stats[p1].points += 3; stats[p1].wins++; stats[p1].sWon += 2; stats[p2].sLost += 2;
        } else if (setsP2 === 2) {
            stats[p2].points += 3; stats[p2].wins++; stats[p2].sWon += 2; stats[p1].sLost += 2;
        } else {
            // Decisão no Tie-break (Set 3)
            if (s3p1 > s3p2) {
                stats[p1].points += 2; stats[p2].points += 1; stats[p1].wins++;
                stats[p1].sWon += 2; stats[p1].sLost += 1; stats[p2].sWon += 1; stats[p2].sLost += 2;
                stats[p1].gFav += 1; // Tie-break conta como 1 game para desempate
            } else if (s3p2 > s3p1) {
                stats[p2].points += 2; stats[p1].points += 1; stats[p2].wins++;
                stats[p2].sWon += 2; stats[p2].sLost += 1; stats[p1].sWon += 1; stats[p1].sLost += 2;
                stats[p2].gFav += 1;
            }
        }
    });

    return Object.values(stats).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;

        const tiedNames = Object.values(stats).filter(p => p.points === a.points).map(p => p.name);

        // SITUAÇÃO 1: Empate entre 2 (Confronto Direto)
        if (tiedNames.length === 2) {
            const m = playedMatches.find(m => (tiedNames.includes(m.player1) && tiedNames.includes(m.player2)));
            if (m) {
                const p1Win = (parseInt(m.s1p1) > parseInt(m.s1p2) && parseInt(m.s2p1) > parseInt(m.s2p2)) || parseInt(m.s3p1) > parseInt(m.s3p2);
                const winner = p1Win ? m.player1 : m.player2;
                return winner === a.name ? -1 : 1;
            }
        }

        // SITUAÇÃO 2: Empate 3+ (Regras Sequenciais)
        if (b.wins !== a.wins) return b.wins - a.wins;
        if ((b.sWon - b.sLost) !== (a.sWon - a.sLost)) return (b.sWon - b.sLost) - (a.sWon - a.sLost);

        // Mini-campeonato paralelo (Pontos entre os empatados)
        const miniLeague = (player) => {
            let p = 0;
            playedMatches.forEach(m => {
                if (tiedNames.includes(m.player1) && tiedNames.includes(m.player2)) {
                    if (m.player1 === player.name || m.player2 === player.name) {
                        const isP1 = m.player1 === player.name;
                        const p1W = (parseInt(m.s1p1) > parseInt(m.s1p2) && parseInt(m.s2p1) > parseInt(m.s2p2)) || parseInt(m.s3p1) > parseInt(m.s3p2);
                        const won = isP1 ? p1W : !p1W;
                        const tb = (parseInt(m.s3p1) || 0) + (parseInt(m.s3p2) || 0) > 0;
                        if (won) p += tb ? 2 : 3; else if (tb) p += 1;
                    }
                }
            });
            return p;
        };
        if (miniLeague(b) !== miniLeague(a)) return miniLeague(b) - miniLeague(a);

        return (b.gFav - b.gAg) - (a.gFav - a.gAg);
    });
};

if (typeof module !== 'undefined') module.exports = { calculateStanding };
