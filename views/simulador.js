// Render function movida de app.js (S3-4) e implementada (S4-4). Script clássico
// carregado após app.js: consome globais (estado, t, fmt, ICON, escapeHtml,
// simularQuitacao) e registra window.__mbRender.simulador.
window.__mbRender = window.__mbRender || {};

// Cache do último resultado da simulação (evita perder o resultado ao re-renderizar).
window.__simCache = window.__simCache || null;

window.__mbRender.simulador = function renderSimulador() {
  const dividas = estado.dividas || [];
  const comSaldo = dividas.filter(d => saldoDivida(d, estado.pagamentos) > 0);

  const form = `
    <div class="card shadow-sm mb-4"><div class="card-body">
      <h3 class="h6 text-secondary text-uppercase mb-3">${t('simulador.titulo')}</h3>
      <div class="row g-3 align-items-end">
        <div class="col-md-5">
          <label class="form-label">${t('simulador.metodo')}</label>
          <select class="form-select" id="sim-estrategia">
            <option value="avalanche" selected>${t('simulador.avalanche')}</option>
            <option value="bolaNeve">${t('simulador.bolaNeve')}</option>
          </select>
        </div>
        <div class="col-md-5">
          <label class="form-label">${t('simulador.pagamentoMensal')} (${t('moeda')})</label>
          <input class="form-control" type="text" inputmode="decimal" step="0.01" min="0"
                 id="sim-pagamento" placeholder="${t('simulador.exPagamento') || '500,00'}" />
        </div>
        <div class="col-md-2">
          <button class="btn btn-primary w-100" data-acao="simular-quitacao">${ICON.simulador || ICON.raio} ${t('simulador.calcular')}</button>
        </div>
      </div>
    </div></div>`;

  if (comSaldo.length === 0) {
    return form + `<div class="alert alert-secondary" role="status">${t('simulador.semDivida')}</div>`;
  }

  const res = window.__simCache;
  let resultado = '';
  if (res) {
    const un = res.meses === 1 ? t('simulador.mesesSing') : t('simulador.mesesPlural');
    // Compara avalanche x bola de neve para apontar a melhor estratégia.
    const av = simularQuitacao(estado.dividas, { estrategia: 'avalanche', pagamentoMensal: res.pagamento, pagamentos: estado.pagamentos });
    const bn = simularQuitacao(estado.dividas, { estrategia: 'bolaNeve', pagamentoMensal: res.pagamento, pagamentos: estado.pagamentos });
    const melhor = (!av.possivel && !bn.possivel) ? null
      : (av.totalJuros <= bn.totalJuros ? 'avalanche' : 'bolaNeve');
    const melhorTxt = melhor === 'avalanche' ? t('simulador.avalanche')
      : melhor === 'bolaNeve' ? t('simulador.bolaNeve') : '—';
    const economia = Math.abs(av.totalJuros - bn.totalJuros);
    resultado = `
      <div class="card shadow-sm"><div class="card-body">
        <h3 class="h6 text-secondary text-uppercase mb-3">${t('simulador.resumo')}</h3>
        <div class="row g-3">
          <div class="col"><div class="text-secondary small">${t('simulador.meses')}</div><div class="h4">${res.meses} ${un}</div></div>
          <div class="col"><div class="text-secondary small">${t('simulador.totalJuros')}</div><div class="h4 text-danger">${fmt.format(res.totalJuros)}</div></div>
          <div class="col"><div class="text-secondary small">${t('simulador.economia')}</div><div class="h4 text-success">${fmt.format(economia)}</div></div>
        </div>
        <div class="alert alert-info d-inline-flex align-items-center gap-2 mt-3" role="status">
          ${t('simulador.melhorEstrategia')}: <b>${melhorTxt}</b>
        </div>
      </div></div>`;
  }

  return form + resultado;
};

/* View "Simulador" como componente Vue (Vue é DONO da view). */
(function () {
  'use strict';
  if (typeof window.MeuBolsoViews === 'undefined') window.MeuBolsoViews = {};
  window.MeuBolsoViews.simulador = {
    name: 'ViewSimulador',
    computed: {
      html() {
        if (window.uiTick) window.uiTick.value;
        const fn = window.__mbRender && window.__mbRender.simulador;
        return fn ? fn() : '';
      }
    },
    template: '<div class="view" v-html="html"></div>'
  };
}());
