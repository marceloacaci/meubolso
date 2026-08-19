// Render function movida de app.js (S3-4). Script clássico carregado após
// app.js: consome globais (estado, t, fmt, ICON, etc.) e registra
// window.__mbRender.backups.
window.__mbRender = window.__mbRender || {};
window.__mbRender.backups = function renderBackups() {
  return `
    <div class="page-header"><h2>${ICON.pasta} ${t('backup.titulo')}</h2></div>
    <div class="row row-cols-1 row-cols-md-2 g-3">
      <div class="col">
        <section class="config-secao h-100">
          <h3>${t('backup.local')}</h3>
          <div class="config-acoes">
            <button class="btn btn-outline-secondary" data-acao="fazerBackup">${ICON.reciclar} ${t('acao.fazerBackup')}</button>
            <button class="btn btn-outline-secondary" data-acao="restaurar">${ICON.reciclar} ${t('acao.restaurar')}</button>
          </div>
        </section>
      </div>
      <div class="col">
        <section class="config-secao h-100">
          <h3>${t('backup.arquivo')}</h3>
          <div class="config-acoes">
            <button class="btn btn-outline-secondary" data-acao="exportar">${ICON.exportar} ${t('acao.exportar')}</button>
            <button class="btn btn-outline-secondary" data-acao="importar">${ICON.importar} ${t('acao.importar')}</button>
          </div>
        </section>
      </div>
    </div>
  `;
};

/* View "Backups" como componente Vue (Vue é DONO da view). */
(function () {
  'use strict';
  if (typeof window.MeuBolsoViews === 'undefined') window.MeuBolsoViews = {};
  window.MeuBolsoViews.backups = {
    name: 'ViewBackups',
    computed: {
      html() {
        if (window.uiTick) window.uiTick.value;
        const fn = window.__mbRender && window.__mbRender.backups;
        return fn ? fn() : '';
      }
    },
    render() { return Vue.h('div', { class: 'view', innerHTML: this.html }); }
  };
}());
