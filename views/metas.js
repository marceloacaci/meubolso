// Render function movida de app.js (S3-4) e implementada (S4-3). Script clássico
// carregado após app.js: consome globais (estado, t, fmt, ICON, escapeHtml) e
// registra window.__mbRender.metas.
window.__mbRender = window.__mbRender || {};

window.__mbRender.metas = function renderMetas() {
  const metas = estado.metas || [];
  const corpo = metas.length === 0
    ? `<div class="alert alert-secondary d-flex align-items-center gap-2" role="status">
         <span style="font-size:20px">${ICON.meta}</span>
         <div>${t('metas.vazia')}</div>
       </div>`
    : `<div class="vstack gap-3">
         ${metas.map(m => {
           const alvo = Math.max(0, numDinheiro(m.valorAlvo));
           const atual = Math.max(0, numDinheiro(m.valorAtual));
           const pct = alvo > 0 ? Math.min(100, Math.round((atual / alvo) * 100)) : (atual > 0 ? 100 : 0);
           const concluida = m.concluida || pct >= 100;
           const faltam = Math.max(0, somaDinheiro(alvo, -atual));
           return `
             <div class="card shadow-sm">
               <div class="card-body">
                 <div class="d-flex align-items-center justify-content-between gap-3 mb-2">
                   <div class="fw-semibold">${ICON.meta} ${escapeHtml(m.titulo)}</div>
                   ${concluida
                     ? `<span class="badge text-bg-success">${t('metas.concluida')}</span>`
                     : `<span class="text-secondary small">${t('metas.faltam')} ${fmt.format(faltam)}</span>`}
                 </div>
                 <div class="d-flex justify-content-between text-secondary small mb-1">
                   <span>${fmt.format(atual)} / ${fmt.format(alvo)}</span>
                   <span>${pct}%</span>
                 </div>
                 <div class="barra-progresso" style="height:14px">
                   <div class="barra-progresso-preenchimento" style="width:${pct}%;background:${concluida ? '#166534' : ''}"></div>
                 </div>
                 ${m.prazo ? `<div class="text-secondary small mt-2">${t('metas.prazo')}: ${escapeHtml(m.prazo)}</div>` : ''}
                 <div class="d-flex gap-2 mt-2">
                   <button class="btn btn-sm btn-outline-secondary" data-acao="editar-meta" data-id="${m.id}" title="${t('metas.editar')}">${t('acao.editar')}</button>
                   <button class="btn btn-sm btn-outline-danger" data-acao="excluir-meta" data-id="${m.id}" title="${t('metas.excluir')}">${t('acao.excluir')}</button>
                 </div>
               </div>
             </div>`;
         }).join('')}
       </div>`;

  return `
    <div class="page-header">
      <h2>${ICON.meta} ${t('metas.titulo')}</h2>
      <button class="btn btn-primary" data-acao="nova-meta">${ICON.mais} ${t('metas.nova')}</button>
    </div>
    ${corpo}
  `;
};

/* View "Metas" como componente Vue (Vue é DONO da view). */
(function () {
  'use strict';
  if (typeof window.MeuBolsoViews === 'undefined') window.MeuBolsoViews = {};
  window.MeuBolsoViews.metas = {
    name: 'ViewMetas',
    computed: {
      html() {
        if (window.uiTick) window.uiTick.value;
        const fn = window.__mbRender && window.__mbRender.metas;
        return fn ? fn() : '';
      }
    },
    template: '<div class="view" v-html="html"></div>'
  };
}());
