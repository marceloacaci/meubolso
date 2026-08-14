// Render function movida de app.js (S3-4). Script clássico carregado apos
// app.js: consome globais (estado, t, fmt, ICON, NIVEIS, escapeHtml, calcularMetricas,
// gerarInsights, window.api, etc.) e registra window.__mbRender.relatorio.
window.__mbRender = window.__mbRender || {};
window.__mbRender.relatorio = function renderRelatorio() {
  const total = estado.dividas.reduce((acc, d) => somaDinheiro(acc, totalDivida(d)), 0);
  const pago = estado.pagamentos.reduce((acc, p) => somaDinheiro(acc, numDinheiro(p.valor)), 0);
  const saldo = Math.max(0, total - pago);
  const restantes = estado.dividas.length;

  const hojeDt = new Date();
  const limite = new Date(); limite.setDate(limite.getDate() + 7);
  const proximas = [];
  for (const d of estado.dividas) {
    const pagosIds = new Set(
      estado.pagamentos.filter(p => p.dividaId === d.id && p.parcelaId).map(p => p.parcelaId)
    );
    for (const p of (d.parcelas || [])) {
      if (pagosIds.has(p.id)) continue;
      const dt = new Date(p.vencimento);
      if (dt >= hojeDt && dt <= limite) {
        proximas.push({ divida: d, parcela: p });
      }
    }
  }
  proximas.sort((a, b) => a.parcela.vencimento.localeCompare(b.parcela.vencimento));

  const progresso = total > 0 ? Math.min(100, (pago / total) * 100) : 0;

  return `
    <div class="page-header">
      <h2>${t('relatorio.titulo')}</h2>
      <div class="d-flex gap-2">
        <button class="btn btn-outline-secondary" data-acao="exportar-csv">${ICON.download || ''} CSV</button>
        <button class="btn btn-outline-secondary" data-acao="exportar-pdf">${ICON.download || ''} PDF</button>
      </div>
    </div>
    <div class="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-3 mb-4">
      <div class="col">
        <div class="card h-100">
          <div class="card-body">
            <div class="text-secondary text-uppercase small mb-1">${t('resumo.totalDividas')}</div>
            <div class="h4 mb-2">${fmt.format(total)}</div>
            <div class="barra-progresso" role="progressbar" aria-label="${progresso.toFixed(0)}${t('resumo.quitado')}" style="height:18px">
              <div class="barra-progresso-preenchimento" style="width:${progresso}%"></div>
            </div>
            <div class="text-secondary small mt-1">${progresso.toFixed(0)}${t('resumo.quitado')}</div>
          </div>
        </div>
      </div>
      <div class="col">
        <div class="card h-100">
          <div class="card-body">
            <div class="text-secondary text-uppercase small mb-1">${t('resumo.totalPago')}</div>
            <div class="h4 mb-0 text-success">${fmt.format(pago)}</div>
          </div>
        </div>
      </div>
      <div class="col">
        <div class="card h-100">
          <div class="card-body">
            <div class="text-secondary text-uppercase small mb-1">${t('resumo.saldoPagar')}</div>
            <div class="h4 mb-0 text-danger">${fmt.format(saldo)}</div>
          </div>
        </div>
      </div>
      <div class="col">
        <div class="card h-100">
          <div class="card-body">
            <div class="text-secondary text-uppercase small mb-1">${t('resumo.dividasAtivas')}</div>
            <div class="h4 mb-0">${restantes}</div>
          </div>
        </div>
      </div>
    </div>

    <h3 class="h6 text-secondary mb-2">${t('resumo.proximos7')}</h3>
    ${proximas.length === 0 ? `
      <div class="alert alert-success d-flex align-items-center gap-2" role="status">
        <span style="font-size:18px">${ICON.check}</span>
        <div>${t('resumo.nenhumaProxima')}</div>
      </div>
    ` : `
      <div class="card shadow-sm">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>${t('col.divida')}</th>
                <th>${t('col.parcela')}</th>
                <th>${t('col.vencimento')}</th>
                <th class="text-end">${t('col.valor')}</th>
                <th class="text-end">${t('col.acao')}</th>
              </tr>
            </thead>
            <tbody>
              ${proximas.map(({divida, parcela}) => `
                <tr>
                  <td>
                    <div class="fw-semibold">${escapeHtml(divida.descricao)}</div>
                    <div class="text-secondary small">${escapeHtml(divida.credor)}</div>
                  </td>
                  <td>${parcela.numero}</td>
                  <td>${fmtData(parcela.vencimento)}</td>
                  <td class="text-end text-danger">${fmt.format(parcela.valor)}</td>
                  <td class="text-end">
                    <button class="btn btn-sm btn-primary" data-acao="pagar" data-id="${divida.id}">${t('acao.pagar')}</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `}
  `;
}
;

/* View "Relatório" como componente Vue (Vue é DONO da view). */
(function () {
  'use strict';
  if (typeof window.MeuBolsoViews === 'undefined') window.MeuBolsoViews = {};
  window.MeuBolsoViews.relatorio = {
    name: 'ViewRelatorio',
    computed: {
      html() {
        if (window.uiTick) window.uiTick.value;
        const fn = window.__mbRender && window.__mbRender.relatorio;
        return fn ? fn() : '';
      }
    },
    // (Re)monta os gráficos APÓS o v-html ser aplicado no DOM (ver views/painel.js).
    // 'mounted' cobre abertura via setView; 'updated' cobre re-renderizações.
    mounted() {
      if (typeof Vue !== 'undefined' && window.ChartGraficos) {
        try { window.ChartGraficos.montar(); } catch (_) {}
      }
    },
    updated() {
      if (typeof Vue !== 'undefined' && window.ChartGraficos) {
        try { window.ChartGraficos.montar(); } catch (_) {}
      }
    },
    template: '<div class="view" v-html="html"></div>'
  };
})();
