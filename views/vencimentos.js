// Render function movida de app.js (S3-4). Script clássico carregado apos
// app.js: consome globais (estado, t, fmt, ICON, NIVEIS, escapeHtml, calcularMetricas,
// gerarInsights, window.api, etc.) e registra window.__mbRender.vencimentos.
window.__mbRender = window.__mbRender || {};
window.__mbRender.vencimentos = function renderVencimentos() {
  const { proximas, atrasadas } = calcularVencimentos();
  const linha = ({ divida, parcela }, atrasada) => `
    <tr>
      <td>
        <div class="fw-semibold">${escapeHtml(divida.descricao)}</div>
        <div class="text-secondary small">${escapeHtml(divida.credor)}</div>
      </td>
      <td>${parcela.numero}</td>
      <td>${fmtData(parcela.vencimento)}</td>
      <td class="text-end ${atrasada ? 'text-danger fw-bold' : 'text-danger'}">${fmt.format(parcela.valor)}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-primary" data-acao="pagar" data-id="${divida.id}">${t('acao.pagar')}</button>
      </td>
    </tr>`;

  const bloco = (titulo, itens, atrasada, vazio) => `
    <h3 class="h6 ${atrasada ? 'text-danger' : 'text-secondary'} mb-2">${titulo}</h3>
    ${itens.length === 0 ? `
      <div class="alert ${atrasada ? 'alert-danger' : 'alert-success'} d-flex align-items-center gap-2" role="status">
        <span style="font-size:18px">${ICON.check}</span>
        <div>${vazio}</div>
      </div>
    ` : `
      <div class="card shadow-sm mb-3">
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
              ${itens.map(i => linha(i, atrasada)).join('')}
            </tbody>
          </table>
        </div>
      </div>`}`;

  return `
    <div class="page-header"><h2>${t('vencimentos.titulo')}</h2></div>
    ${bloco(t('vencimentos.atrasadas'), atrasadas, true, t('vencimentos.nenhumaAtrasada'))}
    ${bloco(t('vencimentos.proximas'), proximas, false, t('vencimentos.nenhumaProxima'))}
  `;
};

/* View "Vencimentos" como componente Vue (Vue é DONO da view). */
(function () {
  'use strict';
  if (typeof window.MeuBolsoViews === 'undefined') window.MeuBolsoViews = {};
  window.MeuBolsoViews.vencimentos = {
    name: 'ViewVencimentos',
    computed: {
      html() {
        if (window.uiTick) window.uiTick.value;
        const fn = window.__mbRender && window.__mbRender.vencimentos;
        return fn ? fn() : '';
      }
    },
    template: '<div class="view" v-html="html"></div>'
  };
})();
