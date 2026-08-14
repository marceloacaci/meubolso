// Render function movida de app.js (S3-4) e implementada (S4-2). Script clássico
// carregado após app.js: consome globais (estado, t, fmt, ICON, escapeHtml,
// totalDivida, saldoDivida, cet, calcularJurosDivida) e registra
// window.__mbRender.juros.
window.__mbRender = window.__mbRender || {};

window.__mbRender.juros = function renderJuros() {
  const dividas = estado.dividas || [];
  const comTaxa = dividas.filter(d => numDinheiro(d.taxaMensal) > 0 && totalDivida(d) > 0);

  const totalPrincipal = dividas.reduce((acc, d) => somaDinheiro(acc, totalDivida(d)), 0);
  const totalJuros = comTaxa.reduce((acc, d) => {
    const r = calcularJurosDivida(d, { taxaMensal: d.taxaMensal, prazoMeses: d.prazoMeses || 12 });
    return somaDinheiro(acc, r.juros);
  }, 0);
  const pctJuros = totalPrincipal > 0 ? Math.round((totalJuros / totalPrincipal) * 100) : 0;

  const tabela = dividas.length === 0
    ? `<div class="alert alert-secondary" role="status">${t('juros.semTaxa')}</div>`
    : `<div class="table-responsive"><table class="table table-hover align-middle mb-0">
         <thead><tr>
           <th>${t('juros.descricao')}</th>
           <th class="text-end">${t('juros.totalPagar')}</th>
           <th class="text-end">${t('juros.custoJuros')}</th>
           <th class="text-end">${t('juros.cet')}</th>
           <th class="text-end">${t('juros.taxaMensal')}</th>
           <th class="text-end">${t('acao.editar')}</th>
         </tr></thead>
         <tbody>
           ${dividas.map(d => {
             const r = (numDinheiro(d.taxaMensal) > 0)
               ? calcularJurosDivida(d, { taxaMensal: d.taxaMensal, prazoMeses: d.prazoMeses || 12 })
               : { total: totalDivida(d), juros: 0, cet: 0 };
             return `
               <tr>
                 <td><div class="fw-semibold">${escapeHtml(d.descricao)}</div></td>
                 <td class="text-end">${fmt.format(r.total)}</td>
                 <td class="text-end ${r.juros > 0 ? 'text-danger' : 'text-success'}">${fmt.format(r.juros)}</td>
                 <td class="text-end">${r.cet.toFixed(2)}%</td>
                 <td class="text-end">${numDinheiro(d.taxaMensal).toFixed(2)}%</td>
                 <td class="text-end"><button class="btn btn-sm btn-outline-secondary" data-acao="editar-juros" data-id="${d.id}">${t('juros.salvarTaxa')}</button></td>
               </tr>`;
           }).join('')}
         </tbody>
       </table></div>`;

  return `
    <div class="page-header"><h2>${ICON.juros || ICON.dinheiro} ${t('juros.titulo')}</h2></div>
    <div class="row g-3 mb-4">
      <div class="col"><div class="card h-100"><div class="card-body">
        <h3 class="h6 text-secondary text-uppercase mb-2">${t('juros.resumoGeral')}</h3>
        <div class="d-flex justify-content-between"><span>${t('juros.totalDividas')}</span><b>${fmt.format(totalPrincipal)}</b></div>
        <div class="d-flex justify-content-between"><span>${t('juros.totalJuros')}</span><b class="text-danger">${fmt.format(totalJuros)}</b></div>
        <div class="d-flex justify-content-between"><span>${t('juros.percentualJuros')}</span><b>${pctJuros}%</b></div>
      </div></div></div>
    </div>
    <div class="card shadow-sm mb-4"><div class="card-body">
      <h3 class="h6 text-secondary text-uppercase mb-3">${t('juros.tituloSecao')}</h3>
      ${tabela}
    </div></div>
  `;
};

/* View "Juros & CET" como componente Vue (Vue é DONO da view). */
(function () {
  'use strict';
  if (typeof window.MeuBolsoViews === 'undefined') window.MeuBolsoViews = {};
  window.MeuBolsoViews.juros = {
    name: 'ViewJuros',
    computed: {
      html() {
        if (window.uiTick) window.uiTick.value;
        const fn = window.__mbRender && window.__mbRender.juros;
        return fn ? fn() : '';
      }
    },
    render() { return Vue.h('div', { class: 'view', innerHTML: this.html }); }
  };
}());
