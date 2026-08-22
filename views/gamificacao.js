// Render function movida de app.js (S3-4). Script clássico carregado apos
// app.js: consome globais (estado, t, fmt, ICON, NIVEIS, escapeHtml, calcularMetricas,
// gerarInsights, window.api, etc.) e registra window.__mbRender.gamificacao.
window.__mbRender = window.__mbRender || {};
window.__mbRender.gamificacao = function renderGamificacao() {
  const g = estado.gamificacao || { xp: 0, nivel: 1, historico: [] };
  const xpTotal = g.xp || 0;
  const nivel = g.nivel || 1;
  const proximo = nivel + 1;

  // Progresso até o próximo nível (usando o limite real da tabela de níveis).
  let txtProgresso, pctBarra, proximoThreshold;
  if (proximo > NIVEIS.length) {
    txtProgresso = t('game.nivelMax');
    // Barra cheia no nível máximo.
    pctBarra = 100;
    proximoThreshold = xpTotal;
  } else {
    proximoThreshold = NIVEIS[proximo - 1].xp; // xp necessário para o próximo nível
    const faltam = Math.max(0, proximoThreshold - xpTotal);
    // Barra proporcional ao intervalo real do nível (progressoNivel), não ao
    // resto linear — coerente com a tabela não-linear e com o badge.
    pctBarra = progressoNivel(xpTotal) * 100;
    txtProgresso = `${xpTotal} / ${proximoThreshold} XP ${t('game.paraProximo')} ${tituloNivel(proximo)}`;
  }

  // --- Detalhes da pontuação ---
  const detalhes = `
    <section class="config-secao game-resumo">
      <h3>${t('game.resumo')}</h3>
      <div class="game-nivel-grande">${ICON.trofeu} ${t('nivel.titulo')} ${nivel} — ${tituloNivel(nivel)}</div>
      <div class="barra-progresso barra-pontos"><div class="barra-progresso-preenchimento" style="width:${pctBarra}%"></div></div>
      <div class="game-xp-linha">
        <span>${t('game.xpAtual')}: <b>${xpTotal}</b></span>
        <span>${xpTotal} / ${proximoThreshold} XP</span>
      </div>
      <p class="game-faltam"><b>${txtProgresso}</b></p>
    </section>`;

  // --- Gráfico de barras: XP por motivo (mesmo degradê da barra do menu) ---
  const graficoXP = `
    <section class="config-secao game-grafico">
      <h3>${t('game.graficoXP')}</h3>
      <div class="game-grafico-wrap">${graficoBarrasXP(g.historico)}</div>
    </section>`;
  const historico = (g.historico || []).slice(0, 30);
  const log = `
    <section class="config-secao">
      <h3>${t('game.log')}</h3>
      ${
        historico.length === 0
          ? `<p class="stat-sub">${t('game.logVazio')}</p>`
          : `
      <ul class="game-log">
        ${historico
          .map((h) => {
            // Resolve ícone + nome (igual à lista de quests). 'xp.saldoAnterior' mantém o nome, mas traduzido.
            const res = resolverMotivo(h.motivo);
            let ico = '',
              nome;
            if (res) {
              ico = res.ico + ' ';
              if (res.quest) {
                nome = t(res.quest);
              } else {
                // Sem nome de quest (ex.: saldo anterior): traduz o próprio motivo (normalizado p/ chave).
                nome = t(normalizarMotivoChave(h.motivo));
              }
            } else {
              // Fallback: normaliza motivos legados (texto ou chave) para o texto traduzido.
              nome = t(normalizarMotivoChave(h.motivo));
            }
            const motivoExibir = ico + escapeHtml(nome);
            return `\n          <li>
            <span class="game-log-motivo">${motivoExibir}</span>
            <span class="game-log-pontos ${h.pontos >= 0 ? 'pos' : 'neg'}">${h.pontos >= 0 ? '+' : ''}${h.pontos} XP</span>
            <span class="game-log-meta">${escapeHtml(h.horario || '')} · ${t('nivel.titulo')} ${h.nivel || '-'}</span>
          </li>`;
          })
          .join('')}
      </ul>`
      }
    </section>`;

  // --- Quests (desafios) que geram pontos ---
  const quests = [
    { ico: ICON.dividaNova, tit: t('game.q.nova'), pts: '+10 XP' },
    { ico: ICON.editar, tit: t('game.q.editar'), pts: '+5 XP' },
    { ico: ICON.dinheiro, tit: t('game.q.pag'), pts: '+15 XP' },
    { ico: ICON.editarPagamento, tit: t('game.q.editarPagamento'), pts: '+8 XP' },
    { ico: ICON.gestao, tit: t('game.q.gestao'), pts: '+5 XP' },
    { ico: ICON.trofeu, tit: t('game.q.quitou'), pts: '+50 XP' },
    { ico: ICON.carteira, tit: t('game.q.novaCarteira'), pts: '+20 XP' },
    { ico: ICON.editarCarteira, tit: t('game.q.editarCarteira'), pts: '+5 XP' },
    { ico: ICON.acesso, tit: t('game.q.acesso'), pts: '+3 XP' },
  ];
  const questsHtml = `
    <section class="config-secao">
      <h3>${t('game.quests')}</h3>
      <ul class="game-quests">
        ${quests
          .map(
            (q) => `
          <li><span class="game-quest-ico">${q.ico}</span>
            <span class="game-quest-tit">${q.tit}</span>
            <span class="game-quest-pts">${q.pts}</span></li>`
          )
          .join('')}
      </ul>
    </section>`;

  // --- Tabela de níveis ---
  const tabela = `
    <section class="config-secao game-tabela">
      <h3>${t('game.tabela')}</h3>
      <table class="game-table">
        <thead><tr><th>${t('game.nivel')}</th><th>XP</th><th>${t('game.tituloNivel')}</th></tr></thead>
        <tbody>
          ${NIVEIS.map(
            (n) => `
            <tr class="${n.nivel === nivel ? 'atual' : ''}">
              <td>${n.nivel}</td>
              <td>${n.xp}</td>
              <td>${tituloNivel(n.nivel)}</td>
            </tr>`
          ).join('')}
        </tbody>
      </table>
    </section>`;

  // --- S9: Hábito & retenção (streak de hoje + ações de desbloqueio) ---
  const hoje = hojeLocal ? hojeLocal() : new Date().toISOString().slice(0, 10);
  const dividas = estado.dividas || [];
  // Dívidas em atraso HOJE: parcela com vencimento < hoje e dívida com saldo > 0.
  let atrasosHoje = 0;
  for (const d of dividas) {
    const saldo =
      d.saldo != null
        ? d.saldo
        : typeof saldoDivida === 'function'
          ? saldoDivida(d, estado.pagamentos || [])
          : 0;
    if (saldo > 0.005) {
      const venc = (d.parcelas || []).filter((p) => p.vencimento && p.vencimento < hoje);
      if (venc.length) atrasosHoje++;
    }
  }
  const semAtrasoHoje = atrasosHoje === 0;
  // E2: streak de hoje (0 se há atraso; 1 se limpo — histórico multi-dia fica p/ etapa de persistência).
  const streakHoje = semAtrasoHoje ? 1 : 0;
  // E3: XP de consistência que o streak representa.
  const xpCons = typeof xpConsistencia === 'function' ? xpConsistencia(streakHoje) : 0;
  // B5: ações que desbloqueiam gamificação, a partir do estado atual.
  const estadoFlags = {
    temDivida: dividas.length > 0,
    temPagamento: (estado.pagamentos || []).length > 0,
    temCarteira: (estado.carteiras || []).length > 0,
    temMeta: (estado.metas || []).length > 0,
  };
  const acoes = typeof acoesDesbloqueio === 'function' ? acoesDesbloqueio(estadoFlags) : [];
  const concluidas =
    typeof desbloqueiosConcluidos === 'function' ? desbloqueiosConcluidos(acoes) : 0;
  const habitoHtml = `
    <section class="config-secao game-habito">
      <h3>${ICON.fogo || '🔥'} ${t('game.habito') || 'Hábito & consistência'}</h3>
      <div class="game-streak-linha">
        <span class="game-streak-badge ${semAtrasoHoje ? 'ok' : 'quebrado'}">
          ${semAtrasoHoje ? (ICON.fogo || '🔥') + ' Sem atrasos hoje' : '⚠ ' + atrasosHoje + ' dívida(s) em atraso'}
        </span>
        <span class="game-streak-xp">${xpCons > 0 ? '+' + xpCons + ' XP de consistência' : ''}</span>
      </div>
      <p class="game-faltam">${t('game.habitoDica') || 'Mantenha os pagamentos em dia para alongar seu streak e ganhar XP de consistência.'}</p>
      <h4>${t('game.desbloqueios') || 'Como desbloquear'} (${concluidas}/${acoes.length})</h4>
      <ul class="game-desbloqueios">
        ${acoes
          .map(
            (a) => `
          <li class="${a.feito ? 'feito' : ''}">
            <span class="game-desb-ico">${a.feito ? ICON.check || '✅' : ICON.lock || '🔒'}</span>
            <span class="game-desb-acao">${escapeHtml(a.acao)}</span>
          </li>`
          )
          .join('')}
      </ul>
    </section>`;

  return `
    <div class="page-header"><h2>${ICON.estrela} ${t('game.titulo')}</h2></div>
    <div class="config-grid config-grid--wide">
      ${detalhes}
      ${graficoXP}
      ${habitoHtml}
      ${log}
      ${questsHtml}
      ${tabela}
    </div>
  `;
};

/* View "Gamificação" (Pontuação e Conquistas) como componente Vue (Vue é DONO da view). */
(function () {
  'use strict';
  if (typeof window.MeuBolsoViews === 'undefined') window.MeuBolsoViews = {};
  window.MeuBolsoViews.gamificacao = {
    name: 'ViewGamificacao',
    computed: {
      html() {
        if (window.uiTick) window.uiTick.value;
        const fn = window.__mbRender && window.__mbRender.gamificacao;
        return fn ? fn() : '';
      },
    },
    // (Re)monta os gráficos APÓS o v-html ser aplicado no DOM (ver views/painel.js).
    // 'mounted' cobre abertura via setView; 'updated' cobre re-renderizações.
    mounted() {
      if (typeof Vue !== 'undefined' && window.ChartGraficos) {
        try {
          window.ChartGraficos.montar();
        } catch (_) {}
      }
    },
    updated() {
      if (typeof Vue !== 'undefined' && window.ChartGraficos) {
        try {
          window.ChartGraficos.montar();
        } catch (_) {}
      }
    },
    render() {
      return Vue.h('div', { class: 'view', innerHTML: this.html });
    },
  };
})();
