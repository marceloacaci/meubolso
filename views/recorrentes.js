// Render function movida de app.js (S3-4) e implementada (S4-1). Script clássico
// carregado após app.js: consome globais (estado, t, fmt, ICON, escapeHtml) e
// registra window.__mbRender.recorrentes.
window.__mbRender = window.__mbRender || {};

// Categorias de despesa recorrente (reaproveita rótulos existentes de dívida).
const RECORRENTE_CATS = {
  servico: { label: 'cat.servico', cor: '#b45309' },
  cartao: { label: 'cat.cartao', cor: '#c1121f' },
  emprestimo: { label: 'cat.emprestimo', cor: '#2d6a4f' },
  outro: { label: 'cat.outro', cor: '#64748b' }
};
// Expõe no global para app.js consumir (scripts clássicos, sem bundler).
if (typeof globalThis !== 'undefined') globalThis.RECORRENTE_CATS = RECORRENTE_CATS;
function recorrenteCatLabel(c) { return t(RECORRENTE_CATS[c]?.label) || c; }

window.__mbRender.recorrentes = function renderRecorrentes() {
  const lista = estado.recorrentes || [];
  const ativos = lista.filter(r => !r.pausada);
  const totalMensal = ativos.reduce((acc, r) => somaDinheiro(acc, numDinheiro(r.valor)), 0);
  const totalAnual = somaDinheiro(totalMensal, totalMensal * 11);

  const corpo = lista.length === 0
    ? `<div class="alert alert-secondary d-flex align-items-center gap-2" role="status">
         <span style="font-size:20px">${ICON.recorrente || ICON.recorrentes || ICON.cartao}</span>
         <div>${t('recorrentes.vazia')}</div>
       </div>`
    : `<div class="vstack gap-2">
         ${lista.map(r => `
           <div class="card shadow-sm">
             <div class="card-body d-flex align-items-center justify-content-between gap-3">
               <div>
                 <div class="fw-semibold">${escapeHtml(r.descricao)}</div>
                 <div class="text-secondary small">
                   <span class="badge rounded-pill text-bg-secondary">${recorrenteCatLabel(r.categoria)}</span>
                   ${r.diaVencimento ? `${t('recorrentes.diaVencimento')}: ${r.diaVencimento} · ` : ''}${fmt.format(Number(r.valor) || 0)}/mês
                   ${r.pausada ? ` · <span class="text-warning fw-semibold">${t('recorrentes.pausada')}</span>` : ''}
                   ${r.observacao ? ` · <span class="text-secondary">${escapeHtml(r.observacao)}</span>` : ''}
                 </div>
               </div>
               <div class="d-flex gap-2">
                 <button class="btn btn-sm btn-outline-secondary" data-acao="editar-recorrente" data-id="${r.id}" title="${t('recorrentes.editar')}">${t('acao.editar')}</button>
                 <button class="btn btn-sm btn-outline-danger" data-acao="excluir-recorrente" data-id="${r.id}" title="${t('recorrentes.excluir')}">${t('acao.excluir')}</button>
               </div>
             </div>
           </div>`).join('')}
       </div>`;

  return `
    <div class="page-header">
      <h2>${ICON.recorrente || ICON.recorrentes || ICON.cartao} ${t('recorrentes.titulo')}</h2>
      <button class="btn btn-primary" data-acao="nova-recorrente">${ICON.mais} ${t('recorrentes.nova')}</button>
    </div>
    <div class="alert alert-info d-inline-flex align-items-center gap-2 mb-3" role="status">
      <span>${t('recorrentes.total')}:</span> <b>${fmt.format(totalMensal)}</b>
      &nbsp;·&nbsp; <span>${t('recorrentes.totalAnual')}:</span> <b>${fmt.format(totalAnual)}</b>
    </div>
    ${corpo}
  `;
};

/* View "Recorrentes" como componente Vue (Vue é DONO da view). */
(function () {
  'use strict';
  if (typeof window.MeuBolsoViews === 'undefined') window.MeuBolsoViews = {};
  window.MeuBolsoViews.recorrentes = {
    name: 'ViewRecorrentes',
    computed: {
      html() {
        if (window.uiTick) window.uiTick.value;
        const fn = window.__mbRender && window.__mbRender.recorrentes;
        return fn ? fn() : '';
      }
    },
    template: '<div class="view" v-html="html"></div>'
  };
}());
