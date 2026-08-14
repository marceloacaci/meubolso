// Render function movida de app.js (S3-4). Script clássico carregado após
// app.js: consome globais (estado, t, fmt, ICON, escapeHtml) e registra
// window.__mbRender.filtros.
window.__mbRender = window.__mbRender || {};
window.__mbRender.filtros = function renderFiltros() {
  return `
    <div class="page-header"><h2>${t('filtros.titulo')}</h2></div>
    <p class="stat-sub">Filtros avançados serão implementados em breve.</p>
  `;
};

/* View "Filtros" como componente Vue (Vue é DONO da view). */
(function () {
  'use strict';
  if (typeof window.MeuBolsoViews === 'undefined') window.MeuBolsoViews = {};
  window.MeuBolsoViews.filtros = {
    name: 'ViewFiltros',
    computed: {
      html() {
        if (window.uiTick) window.uiTick.value;
        const fn = window.__mbRender && window.__mbRender.filtros;
        return fn ? fn() : '';
      }
    },
    render() { return Vue.h('div', { class: 'view', innerHTML: this.html }); }
  };
}());
