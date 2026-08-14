// Render function movida de app.js (S3-4). Script clássico carregado após
// app.js: consome globais (estado, t, fmt, ICON, NIVEIS, nivelDe,
// progressoNivel, tituloNivel) e registra window.__mbRender.conquistas.
window.__mbRender = window.__mbRender || {};
window.__mbRender.conquistas = function renderConquistas() {
  const g = estado.gamificacao || { xp: 0, nivel: 1, historico: [] };
  const xpTotal = g.xp || 0;
  const nivel = g.nivel || 1;
  const historico = (g.historico || []).slice(0, 20);

  const linhas = NIVEIS.map(n => {
    const atingido = nivel >= n.nivel;
    const pct = Math.max(0, Math.min(100, progressoNivel(xpTotal) * 100));
    return `
      <tr class="${atingido ? 'atual' : ''}">
        <td>${n.nivel}</td>
        <td>${n.xp} XP</td>
        <td>${tituloNivel(n.nivel)}</td>
        <td style="width:40%">
          <div class="barra-progresso barra-pontos">
            <div class="barra-progresso-preenchimento" style="width:${pct}%"></div>
          </div>
        </td>
        <td>${atingido ? 'Concluído' : 'Em progresso'}</td>
      </tr>`;
  }).join('');

  const log = historico.length === 0
    ? `<p class="stat-sub">${t('game.logVazio')}</p>`
    : `<ul class="game-log">${historico.map(h => `
        <li>
          <span class="game-log-motivo">${escapeHtml(h.motivo || '')}</span>
          <span class="game-log-pontos ${h.pontos >= 0 ? 'pos' : 'neg'}">${h.pontos >= 0 ? '+' : ''}${h.pontos} XP</span>
          <span class="game-log-meta">${escapeHtml(h.horario || '')} · ${t('nivel.titulo')} ${h.nivel || '-'}</span>
        </li>`).join('')}</ul>`;

  return `
    <div class="page-header"><h2>${t('conquistas.titulo')}</h2></div>
    <div class="row g-3 mb-4">
      <div class="col">
        <section class="config-secao">
          <h3>${t('nivel.titulo')} ${nivel} — ${tituloNivel(nivel)}</h3>
          <div class="barra-progresso barra-pontos">
            <div class="barra-progresso-preenchimento" style="width:${progressoNivel(xpTotal) * 100}%"></div>
          </div>
          <p class="stat-sub">${xpTotal} XP · ${t('game.resumo')}</p>
        </section>
      </div>
    </div>
    <div class="row g-3">
      <div class="col">
        <section class="config-secao">
          <h3>${t('game.tabela')}</h3>
          <div class="table-responsive">
            <table class="game-table">
              <thead><tr><th>${t('game.nivel')}</th><th>XP</th><th>${t('game.tituloNivel')}</th><th>Progresso</th><th>Status</th></tr></thead>
              <tbody>${linhas}</tbody>
            </table>
          </div>
        </section>
      </div>
      <div class="col-12 col-lg-5">
        <section class="config-secao">
          <h3>${t('game.log')}</h3>
          ${log}
        </section>
      </div>
    </div>
  `;
};

/* View "Conquistas" como componente Vue (Vue é DONO da view). */
(function () {
  'use strict';
  if (typeof window.MeuBolsoViews === 'undefined') window.MeuBolsoViews = {};
  window.MeuBolsoViews.conquistas = {
    name: 'ViewConquistas',
    computed: {
      html() {
        if (window.uiTick) window.uiTick.value;
        const fn = window.__mbRender && window.__mbRender.conquistas;
        return fn ? fn() : '';
      }
    },
    render() { return Vue.h('div', { class: 'view', innerHTML: this.html }); }
  };
}());
