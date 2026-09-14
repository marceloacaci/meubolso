// Render function movida de app.js (S3-4). Script clássico carregado apos
// app.js: consome globais (estado, t, fmt, ICON, NIVEIS, escapeHtml, calcularMetricas,
// gerarInsights, window.api, etc.) e registra window.__mbRender.painel.
window.__mbRender = window.__mbRender || {};
window.__mbRender.painel = function renderPainel() {
  const metricas = calcularMetricas();
  const insights = gerarInsights(metricas);

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
          <div class="card-body">
            <h3 class="h6 text-secondary text-uppercase mb-2">${t('painel.categoria')}</h3>
            <div class="chart-wrap">${graficoPizza(metricas.porCategoria)}</div>
            ${
              metricas.porCategoria.length
                ? `<div class="legend">${metricas.porCategoria
                    .map(
                      (c) => `
              <span class="legend-item"><span class="legend-dot" style="background:${c.cor}"></span>${c.label} ${fmt.format(c.valor)}</span>`
                    )
                    .join('')}</div>`
                : `<p class="text-secondary small mb-0">${t('painel.semDados')}</p>`
            }
          </div>
        </div>
      </div>

      <div class="col">
        <div class="card h-100">
          <div class="card-body">
            <h3 class="h6 text-secondary text-uppercase mb-2">${t('painel.composicao')}</h3>
            <div class="chart-wrap">${graficoRosca(metricas)}</div>
            <div class="legend">
              <span class="legend-item"><span class="legend-dot" style="background:#2d6a4f"></span>${t('painel.pago')} ${fmt.format(metricas.totalPago)}</span>
              <span class="legend-item"><span class="legend-dot" style="background:#c1121f"></span>${t('painel.emAberto')} ${fmt.format(metricas.saldo)}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="col">
        <div class="card h-100">
          <div class="card-body">
            <h3 class="h6 text-secondary text-uppercase mb-2">${t('painel.status')}</h3>
            <div class="chart-wrap">${graficoBarrasStatus(metricas.porStatus)}</div>
            <div class="legend">
              ${metricas.porStatus.map((s) => `<span class="legend-item"><span class="legend-dot" style="background:${s.cor}"></span>${s.label} ${s.qtd}</span>`).join('')}
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
    </div>
  `;
};

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
    // O gráfico (Chart.js) precisa ser (re)montado APÓS o Vue aplicar o novo
    // v-html no DOM. O render() global agenda montar() via nextTick, mas esse
    // nextTick pode rodar ANTES do patch do v-html — deixando o <canvas> novo
    // indisponível e o gráfico em branco. O hook updated() roda sempre DEPOIS
    // (Re)monta os gráficos APÓS o v-html ser aplicado no DOM (ver views/painel.js).
    // 'mounted' cobre o caso em que a view é aberta via setView (componente recém-montado);
    // 'updated' cobre re-renderizações (ex: inserir dívida estando já no painel).
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
