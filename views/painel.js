// Render function movida de app.js (S3-4). Script clássico carregado apos
// app.js: consome globais (estado, t, fmt, ICON, NIVEIS, escapeHtml, calcularMetricas,
// gerarInsights, window.api, etc.) e registra window.__mbRender.painel.
window.__mbRender = window.__mbRender || {};
window.__mbRender.painel = function renderPainel() {
  const metricas = calcularMetricas();
  const insights = gerarInsights(metricas);
  const categoriasOrdenadas = [...metricas.porCategoria].sort((a, b) => b.valor - a.valor);

  return `
    <div class="painel-view">
    <div class="page-header"><h2>${ICON.painel} ${t('painel.titulo')}</h2></div>

    <div class="mb-4">
      <div class="card h-100">
        <div class="card-body">
          <h3 class="h6 text-secondary text-uppercase mb-2">${t('painel.resumo')}</h3>
          <div class="h3 mb-1">${fmt.format(metricas.totalGeral)}</div>
          <div class="text-secondary small">${t('painel.totalDividas')} (${estado.dividas.length})</div>
          <div class="d-flex justify-content-between text-secondary small mt-3 mb-1">
            <span>${t('painel.quitado')}</span><span>${metricas.progresso.toFixed(0)}%</span>
          </div>
          <div class="barra-progresso" style="height:18px">
            <div class="barra-progresso-preenchimento" style="width:${metricas.progresso}%"></div>
          </div>
          <div class="d-flex gap-4 mt-3">
            <div><div class="text-secondary small">${t('painel.pago')}</div><div class="fw-semibold text-success">${fmt.format(metricas.totalPago)}</div></div>
            <div><div class="text-secondary small">${t('painel.saldo')}</div><div class="fw-semibold text-danger">${fmt.format(metricas.saldo)}</div></div>
          </div>
        </div>
      </div>
    </div>

    <div class="row row-cols-1 row-cols-lg-3 g-3 mb-4">
      <div class="col">
        <div class="card h-100">
          <div class="card-body chart-card-body">
            <h3 class="h6 text-secondary text-uppercase mb-2">${t('painel.categoria')}</h3>
            ${graficoPizza(metricas.porCategoria)}
            ${
              categoriasOrdenadas.length
                ? `<div class="legend">${categoriasOrdenadas
                    .map(
                      (c, i) => `
              <span class="legend-item" data-idx="${i}" role="button" tabindex="0" title="${c.label}: ${fmt.format(c.valor)}"><span class="legend-dot" style="background:${c.cor}"></span><span class="legend-label">${c.label}</span> <strong class="legend-valor">${fmt.format(c.valor)}</strong></span>`
                    )
                    .join('')}</div>`
                : `<p class="text-secondary small mb-0">${t('painel.semDados')}</p>`
            }
          </div>
        </div>
      </div>

      <div class="col">
        <div class="card h-100">
          <div class="card-body chart-card-body">
            <h3 class="h6 text-secondary text-uppercase mb-2">${t('painel.composicao')}</h3>
            ${graficoRosca(metricas)}
            <div class="legend">
              <span class="legend-item" data-idx="0" role="button" tabindex="0" title="${t('painel.pago')}: ${fmt.format(metricas.totalPago)}"><span class="legend-dot" style="background:#2d6a4f"></span><span class="legend-label">${t('painel.pago')}</span> <strong class="legend-valor">${fmt.format(metricas.totalPago)}</strong></span>
              <span class="legend-item" data-idx="1" role="button" tabindex="0" title="${t('painel.emAberto')}: ${fmt.format(metricas.saldo)}"><span class="legend-dot" style="background:#c1121f"></span><span class="legend-label">${t('painel.emAberto')}</span> <strong class="legend-valor">${fmt.format(metricas.saldo)}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <div class="col">
        <div class="card h-100">
          <div class="card-body chart-card-body">
            <h3 class="h6 text-secondary text-uppercase mb-2">${t('painel.status')}</h3>
            ${graficoBarrasStatus(metricas.porStatus)}
            <div class="legend">
              ${metricas.porStatus.map((s, i) => `<span class="legend-item" data-idx="${i}" role="button" tabindex="0" title="${s.label}: ${s.qtd}"><span class="legend-dot" style="background:${s.cor}"></span><span class="legend-label">${s.label}</span> <strong class="legend-valor">${s.qtd}</strong></span>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-3">
      <div class="col-12">
        <div class="card h-100">
          <div class="card-body">
            <h3 class="h6 text-secondary text-uppercase mb-2">${t('painel.insights')}</h3>
            <ul class="list-group list-group-flush">
              ${insights.map((i) => `<li class="list-group-item d-flex gap-2 align-items-start px-0 border-0"><span>${i.ico}</span><span>${i.texto}</span></li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
    </div>
  `;
};

// Vinculação de eventos de hover nas legendas para sincronização bidirecional com os gráficos
if (typeof document !== 'undefined' && !window.__mbLegendHoverBound) {
  window.__mbLegendHoverBound = true;
  document.addEventListener('mouseover', (e) => {
    const item = e.target && e.target.closest ? e.target.closest('.legend-item') : null;
    if (!item) return;
    const card = item.closest('.chart-card-body');
    if (!card) return;
    const canvas = card.querySelector('canvas');
    if (!canvas || !canvas.id) return;
    const idx = item.getAttribute('data-idx');
    if (idx !== null && window.ChartGraficos && window.ChartGraficos.ativarHover) {
      window.ChartGraficos.ativarHover(canvas.id, parseInt(idx, 10));
    }
  });

  document.addEventListener('mouseout', (e) => {
    const item = e.target && e.target.closest ? e.target.closest('.legend-item') : null;
    if (!item) return;
    const related = e.relatedTarget;
    if (related && item.contains(related)) return;
    const card = item.closest('.chart-card-body');
    if (!card) return;
    const canvas = card.querySelector('canvas');
    if (!canvas || !canvas.id) return;
    if (window.ChartGraficos && window.ChartGraficos.desativarHover) {
      window.ChartGraficos.desativarHover(canvas.id);
    }
  });
}

/* View "Painel" como componente Vue (Vue é DONO da view).
 * O template é fino: apenas injeta o HTML gerado por renderPainel()
 * (função pura do app.js, exposta em window.__mbRender). A reatividade
 * vem de window.uiTick — qualquer ação que antes chamava render() agora
 * incrementa o tick, e este computed recalcula sozinho (sem congelamento).
 */
(function () {
  'use strict';
  if (typeof window.MeuBolsoViews === 'undefined') window.MeuBolsoViews = {};
  window.MeuBolsoViews.painel = {
    name: 'ViewPainel',
    computed: {
      html() {
        if (window.uiTick) window.uiTick.value; // registra dependência reativa
        const fn = window.__mbRender && window.__mbRender.painel;
        return fn ? fn() : '';
      },
    },
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
