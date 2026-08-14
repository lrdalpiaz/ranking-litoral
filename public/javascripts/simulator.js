console.log("=== SIMULADOR: CONTROLLER INICIADO CORRETAMENTE ===");
console.log("Atletas recebidos no grupo:", players);
console.log("Total de partidas recebidas:", initialMatches.length);

window.addEventListener('DOMContentLoaded', () => {
  console.log("DOM Carregado no Controller externo. Vinculando inputs...");
  
  document.querySelectorAll('.sim-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const idx = e.target.getAttribute('data-match');
      checkTiebreakLock(idx);
      updateSimulation();
    });
  });

  initialMatches.forEach((_, idx) => checkTiebreakLock(idx));
  updateSimulation();
});

function checkTiebreakLock(idx) {
  try {
    const s1p1 = parseInt(document.querySelector(`[data-match="${idx}"][data-set="1"][data-player="p1"]`)?.value) || 0;
    const s1p2 = parseInt(document.querySelector(`[data-match="${idx}"][data-set="1"][data-player="p2"]`)?.value) || 0;
    const s2p1 = parseInt(document.querySelector(`[data-match="${idx}"][data-set="2"][data-player="p1"]`)?.value) || 0;
    const s2p2 = parseInt(document.querySelector(`[data-match="${idx}"][data-set="2"][data-player="p2"]`)?.value) || 0;
    
    const tbInputs = document.querySelectorAll(`[data-match="${idx}"][data-set="3"]`);
    const p1WinsTwo = (s1p1 > s1p2 && s2p1 > s2p2);
    const p2WinsTwo = (s1p2 > s1p1 && s2p2 > s2p1);

    if (p1WinsTwo || p2WinsTwo) {
      tbInputs.forEach(input => { input.value = ''; input.disabled = true; input.style.opacity = '0.3'; });
    } else if (!initialMatches[idx].played) {
      tbInputs.forEach(input => { input.disabled = false; input.style.opacity = '1'; });
    }
  } catch (err) {
    console.error("Erro no checkTiebreak:", err);
  }
}

function updateSimulation() {
  if (!players || !players.length) return;

  try {
    // MAPEAMENTO: Garante o formato aninhado (match.set1.p1) esperado pelo calculateStanding
    const simulatedMatches = initialMatches.map((m, i) => {
      // Se o jogo já foi jogado na realidade, retornamos a estrutura original do banco intacta
      if (m.played) {
        return {
          // player1: m.player1Id.name,
          // player2: m.player2Id.name,
          // player1Email: m.player1Id.email,
          // player2Email: m.player2Id.email,
          player1Id: m.player1Id,
          player2Id: m.player2Id,
          className: m.className,
          groupNumber: m.groupNumber,
          set1: { p1: parseInt(m.set1?.p1) || 0, p2: parseInt(m.set1?.p2) || 0 },
          set2: { p1: parseInt(m.set2?.p1) || 0, p2: parseInt(m.set2?.p2) || 0 },
          set3: { p1: parseInt(m.set3?.p1) || 0, p2: parseInt(m.set3?.p2) || 0 }
        };
      }

      // Se o jogo está pendente, capturamos os inputs da tela e montamos a estrutura aninhada
      const s1p1In = document.querySelector(`[data-match="${i}"][data-set="1"][data-player="p1"]`);
      const s1p2In = document.querySelector(`[data-match="${i}"][data-set="1"][data-player="p2"]`);
      const s2p1In = document.querySelector(`[data-match="${i}"][data-set="2"][data-player="p1"]`);
      const s2p2In = document.querySelector(`[data-match="${i}"][data-set="2"][data-player="p2"]`);
      const s3p1In = document.querySelector(`[data-match="${i}"][data-set="3"][data-player="p1"]`);
      const s3p2In = document.querySelector(`[data-match="${i}"][data-set="3"][data-player="p2"]`);

      return {
        // player1: m.player1Id.name,
        // player2: m.player2Id.name,
        // player1Email: m.player1Id.email,
        // player2Email: m.player2Id.email,
        player1Id: m.player1Id,
        player2Id: m.player2Id,
        className: m.className,
        groupNumber: m.groupNumber,
        set1: {
          p1: s1p1In && s1p1In.value !== '' ? parseInt(s1p1In.value) : 0,
          p2: s1p2In && s1p2In.value !== '' ? parseInt(s1p2In.value) : 0
        },
        set2: {
          p1: s2p1In && s2p1In.value !== '' ? parseInt(s2p1In.value) : 0,
          p2: s2p2In && s2p2In.value !== '' ? parseInt(s2p2In.value) : 0
        },
        set3: {
          p1: s3p1In && s3p1In.value !== '' ? parseInt(s3p1In.value) : 0,
          p2: s3p2In && s3p2In.value !== '' ? parseInt(s3p2In.value) : 0
        }
      };
    });

    // Executa o cálculo com a estrutura aninhada unificada
    const sorted = calculateStanding(players, simulatedMatches);
    
    const tbody = document.querySelector('#sim-table tbody');
    if (!tbody) return;

    tbody.innerHTML = sorted.map((p, idx) => `
      <tr class="${idx < 2 ? 'table-success' : ''}" style="transition: all 0.3s ease;">
        <td class="align-middle fw-bold small">
          <div class="d-flex align-items-center">
            <div class="d-inline-block text-center me-2" style="width: 20px; flex-shrink: 0;">
              ${idx < 2 ? '<i class="bi bi-check-circle-fill text-success" style="font-size: 0.85rem;"></i>' : ''}
            </div>
            <span>${p.name}</span>
          </div>
        </td>
        <td class="text-center align-middle fw-bold table-primary" style="background-color: rgba(13, 110, 253, 0.08) !important; color: #0a58ca !important;">
          ${p.points}
        </td>
        <td class="text-center align-middle">${p.matches}</td>
        <td class="text-center align-middle">${p.wins}</td>
        <td class="text-center align-middle ${p.sWon - p.sLost > 0 ? 'text-success fw-bold' : (p.sWon - p.sLost < 0 ? 'text-danger' : '')}">
          ${p.sWon - p.sLost > 0 ? '+' : ''}${p.sWon - p.sLost}
        </td>
        <td class="text-center align-middle ${p.gFav - p.gAg > 0 ? 'text-success fw-bold' : (p.gFav - p.gAg < 0 ? 'text-danger' : '')}">
          ${p.gFav - p.gAg > 0 ? '+' : ''}${p.gFav - p.gAg}
        </td>
      </tr>
    `).join('');

  } catch (err) {
    console.error("Erro interno na renderização do simulador:", err);
  }
}

function resetSimulation() {
  document.querySelectorAll('.sim-input:not(:disabled)').forEach(input => input.value = '');
  initialMatches.forEach((_, idx) => checkTiebreakLock(idx));
  updateSimulation();
}
