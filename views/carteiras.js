// Render function movida de app.js (S3-4). Script clássico carregado apos
// app.js: consome globais (estado, t, fmt, ICON, NIVEIS, escapeHtml, calcularMetricas,
// gerarInsights, window.api, etc.) e registra window.__mbRender.carteiras.
window.__mbRender = window.__mbRender || {};
window.__mbRender.carteiras = function renderCarteiras() {
  const carteiras = estado.carteiras || [];
  const total = saldoTotalCarteiras();

  const lista = carteiras.length === 0
    ? `<div class="alert alert-secondary d-flex align-items-center gap-2" role="status">
       <span style="font-size:20px">${ICON.carteira}</span>
       <div>${t('carteira.vazia')}</div>
     </div>`
    : `<div class="vstack gap-2">
         ${carteiras.map(c => `
           <div class="card shadow-sm">
             <div class="card-body d-flex align-items-center justify-content-between gap-3">
               <div>
                 <div class="fw-semibold">${escapeHtml(c.nome)}</div>
                 <div class="h5 mb-1 text-primary">${fmt.format(Number(c.saldo) || 0)}</div>
               </div>
               <div class="d-flex gap-2">
                 <button class="btn btn-sm btn-outline-secondary" data-acao="editar-carteira" data-id="${c.id}" title="${t('carteira.editar')}">${t('acao.editar')}</button>
                 <button class="btn btn-sm btn-outline-danger" data-acao="excluir-carteira" data-id="${c.id}" title="${t('carteira.excluir')}">${t('acao.excluir')}</button>
               </div>
             </div>
           </div>`).join('')}
       </div>`;

  return `
    <div class="page-header">
      <h2>${ICON.carteira} ${t('carteira.titulo')}</h2>
      <button class="btn btn-primary" data-acao="nova-carteira">${ICON.mais} ${t('carteira.nova')}</button>
    </div>
    <div class="alert alert-info d-inline-flex align-items-center gap-2 mb-3" role="status">
      <span>${t('carteira.total')}:</span> <b>${fmt.format(total)}</b>
    </div>
    ${lista}
  `;
};

/* View "Carteiras" como componente Vue (Vue é DONO da view). */
(function () {
  'use strict';
  if (typeof window.MeuBolsoViews === 'undefined') window.MeuBolsoViews = {};
  window.MeuBolsoViews.carteiras = {
    name: 'ViewCarteiras',
    computed: {
      html() {
        if (window.uiTick) window.uiTick.value;
        const fn = window.__mbRender && window.__mbRender.carteiras;
        return fn ? fn() : '';
      }
    },
    template: '<div class="view" v-html="html"></div>'
  };
})();
