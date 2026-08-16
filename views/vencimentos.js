// Render function movida de app.js (S3-4) e estendida (S5-1 busca/filtros).
// Script clássico carregado apos app.js: consome globais (estado, t, fmt, ICON,
// NIVEIS, escapeHtml, calcularVencimentos, normalizarTexto, definirFiltro,
// limparFiltro, window.api, etc.) e registra window.__mbRender.vencimentos.
window.__mbRender = window.__mbRender || {};
function renderPainelFiltrosVencimentos() {
  const f = estado.filtro || {};
  const temFiltro = f.texto || f.periodoDe || f.periodoAte;
  const lupa = `<span class="input-lupa" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></span>`;
  return `
    <div class="card shadow-sm mb-3">
      <div class="card-body d-flex flex-wrap gap-2 align-items-end">
        <div class="flex-grow-1" style="min-width:200px">
          <label class="form-label small mb-1">${t('filtro.busca')}</label>
          <div class="input-com-lupa">
            ${lupa}
            <input type="search" class="form-control campo-busca" placeholder="${t('filtro.buscaPlaceholder')}"
              value="${escapeHtml(f.texto || '')}" />
          </div>
        </div>
        <div>
          <label class="form-label small mb-1">${t('filtro.periodoDe')}</label>
          <input type="month" class="form-control" value="${escapeHtml(f.periodoDe || '')}" onchange="definirFiltro('periodoDe', this.value)" />
        </div>
        <div>
          <label class="form-label small mb-1">${t('filtro.periodoAte')}</label>
          <input type="month" class="form-control" value="${escapeHtml(f.periodoAte || '')}" onchange="definirFiltro('periodoAte', this.value)" />
        </div>
        <div>
          <label class="form-label small mb-1">&nbsp;</label>
          <button class="btn btn-limpar-destaque d-block" data-acao="limpar-filtro" ${temFiltro ? '' : 'disabled'}>${t('acao.limpar')}</button>
        </div>
      </div>
    </div>`;
}
window.__mbRender.vencimentos = function renderVencimentos() {
  const { proximas, atrasadas } = calcularVencimentos(estado.filtro);
  const linha = ({ divida, parcela, dias }, atrasada) => `
    <tr>
      <td>
        <div class="fw-semibold">${escapeHtml(divida.descricao)}</div>
        <div class="text-secondary small">${escapeHtml(divida.credor)}</div>
      </td>
      <td>${parcela.numero}</td>
      <td>${fmtData(parcela.vencimento)}</td>
      <td class="${atrasada ? 'text-danger fw-bold' : 'text-secondary'}">${atrasada ? ti('relatorio.diasAtraso', { n: dias }) : dias}</td>
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
                <th>${atrasada ? t('col.dias') : t('col.diasVencimento')}</th>
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
    ${renderPainelFiltrosVencimentos()}
    ${bloco(t('vencimentos.atrasadas'), atrasadas, true, t('vencimentos.nenhumaAtrasada'))}
    ${bloco(t('vencimentos.proximas'), proximas, false, t('vencimentos.nenhumaProxima'))}
  `;
};
;

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
    render() { return Vue.h('div', { class: 'view', innerHTML: this.html }); }
  };
})();
