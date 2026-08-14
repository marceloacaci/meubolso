// Render function movida de app.js (S3-4) e estendida (S5-1 busca/filtros,
// S5-5 ordenação/paginação). Script clássico carregado após app.js: consome
// globais (estado, t, fmt, ICON, CATEGORIAS, escapeHtml, somaDinheiro,
// totalDivida, totalPago, saldoDivida, filtrarDividas, ordenarDividas, paginar)
// e registra window.__mbRender.dividas.
window.__mbRender = window.__mbRender || {};

// Painel de busca/filtros (S5-1) + ordenação (S5-5). Inputs chamam definirFiltro()
// via handler inline (funciona em elementos v-html: o browser executa o global).
function renderPainelFiltrosDividas() {
  const f = estado.filtro || {};
  const optsCat = ['servico', 'cartao', 'emprestimo', 'outro'].map(c =>
    `<option value="${c}"${f.categoria === c ? ' selected' : ''}>${t(CATEGORIAS[c]?.label) || c}</option>`).join('');
  const optsStatus = [
    ['', t('filtro.todos')],
    ['emDia', t('filtro.emDia')],
    ['atrasado', t('filtro.atrasado')],
    ['quitado', t('filtro.quitado')]
  ].map(([v, l]) => `<option value="${v}"${f.status === v ? ' selected' : ''}>${l}</option>`).join('');
  const optsOrd = [
    ['descricao', t('ord.descricao')],
    ['credor', t('ord.credor')],
    ['total', t('ord.total')],
    ['saldo', t('ord.saldo')]
  ].map(([v, l]) => `<option value="${v}"${f.ordenar === v ? ' selected' : ''}>${l}</option>`).join('');
  const temFiltro = f.texto || f.categoria || f.status || f.periodo;
  return `
    <div class="card shadow-sm mb-3">
      <div class="card-body d-flex flex-wrap gap-2 align-items-end">
        <div class="flex-grow-1" style="min-width:200px">
          <label class="form-label small mb-1">${t('filtro.busca')}</label>
          <input id="busca" type="search" class="form-control" placeholder="${t('filtro.buscaPlaceholder')}"
            value="${escapeHtml(f.texto || '')}" oninput="definirFiltro('texto', this.value)" />
        </div>
        <div>
          <label class="form-label small mb-1">${t('filtro.categoria')}</label>
          <select class="form-select" onchange="definirFiltro('categoria', this.value)">
            <option value="">${t('filtro.todas')}</option>${optsCat}
          </select>
        </div>
        <div>
          <label class="form-label small mb-1">${t('filtro.status')}</label>
          <select class="form-select" onchange="definirFiltro('status', this.value)">
            ${optsStatus}
          </select>
        </div>
        <div>
          <label class="form-label small mb-1">${t('filtro.periodo')}</label>
          <input type="month" class="form-control" value="${escapeHtml(f.periodo || '')}" onchange="definirFiltro('periodo', this.value)" />
        </div>
        <div>
          <label class="form-label small mb-1">${t('filtro.ordenar')}</label>
          <select class="form-select" onchange="definirFiltro('ordenar', this.value)">
            ${optsOrd}
          </select>
        </div>
        <div>
          <label class="form-label small mb-1">&nbsp;</label>
          <button class="btn btn-outline-secondary d-block" data-acao="limpar-filtro" title="${t('filtro.limpar')}" ${temFiltro ? '' : 'disabled'}>${t('acao.limpar')}</button>
        </div>
      </div>
    </div>`;
}

window.__mbRender.dividas = function renderDividas() {
  if (estado.dividas.length === 0) {
    return `
      <div class="page-header">
        <h2>${t('dividas.titulo')}</h2>
        <button class="btn btn-primary" data-acao="nova-divida">${ICON.mais} ${t('divida.nova')}</button>
      </div>
      <div class="alert alert-secondary d-flex align-items-center gap-2" role="status">
        <span style="font-size:20px">${ICON.dividas}</span>
        <div>${t('empty.dividas')}</div>
      </div>
    `;
  }
  const f = estado.filtro || {};
  let lista = filtrarDividas(estado.dividas, f);
  lista = ordenarDividas(lista, f.ordenar || 'descricao', f.asc !== false);
  const pg = paginar(lista, f.pagina || 1, f.porPagina || 12);

  const linhas = pg.itens.map(d => `
    <tr>
      <td>
        <div class="fw-semibold">${escapeHtml(d.descricao)}</div>
        <div class="text-secondary small">${escapeHtml(d.credor)} · ${(d.parcelas||[]).length} ${t('divida.parcelas')}${(d.parcelas||[]).some(p => (p.status || 'pendente') === 'atrasado') ? ' · <span class="text-danger fw-semibold">' + t('divida.comAtraso') + '</span>' : ''}${d.observacao ? ` · <span class="text-secondary">${escapeHtml(d.observacao)}</span>` : ''}</div>
      </td>
      <td><span class="badge rounded-pill text-bg-secondary">${t(CATEGORIAS[d.categoria]?.label) || d.categoria}</span></td>
      <td class="text-end">${fmt.format(totalDivida(d))}</td>
      <td class="text-end text-success">${fmt.format(totalPago(d))}</td>
      <td class="text-end ${saldoDivida(d) > 0 ? 'text-danger' : 'text-success'}">${fmt.format(saldoDivida(d))}</td>
      <td class="text-end text-nowrap">
        <button class="btn btn-sm btn-outline-secondary" data-acao="editar-divida" data-id="${d.id}">${t('acao.editar')}</button>
        <button class="btn btn-sm btn-outline-danger" data-acao="excluir-divida" data-id="${d.id}">${t('acao.excluir')}</button>
        <button class="btn btn-sm btn-primary" data-acao="gerenciar-pagamentos" data-id="${d.id}">${t('pagamento.gerenciar')}</button>
      </td>
    </tr>`).join('');

  const paginacao = pg.totalPaginas > 1 ? `
    <div class="d-flex justify-content-between align-items-center mt-3">
      <span class="text-secondary small">${t('paginacao.mostrando')} ${pg.itens.length} / ${pg.total}</span>
      <div class="btn-group">
        <button class="btn btn-sm btn-outline-secondary" ${pg.pagina <= 1 ? 'disabled' : ''} data-acao="pagina" data-pag="${pg.pagina - 1}">${t('paginacao.anterior')}</button>
        <span class="btn btn-sm btn-outline-secondary disabled">${pg.pagina} / ${pg.totalPaginas}</span>
        <button class="btn btn-sm btn-outline-secondary" ${pg.pagina >= pg.totalPaginas ? 'disabled' : ''} data-acao="pagina" data-pag="${pg.pagina + 1}">${t('paginacao.proxima')}</button>
      </div>
    </div>` : '';

  return `
    <div class="page-header">
      <h2>${t('dividas.titulo')}</h2>
      <button class="btn btn-primary" data-acao="nova-divida">${ICON.mais} ${t('divida.nova')}</button>
    </div>
    ${renderPainelFiltrosDividas()}
    <div class="card shadow-sm">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>${t('col.divida')}</th>
              <th>${t('col.categoria')}</th>
              <th class="text-end">${t('col.total')}</th>
              <th class="text-end">${t('col.pago')}</th>
              <th class="text-end">${t('col.saldo')}</th>
              <th class="text-end">${t('col.acao')}</th>
            </tr>
          </thead>
          <tbody>
            ${linhas || `<tr><td colspan="6" class="text-center text-secondary py-4">${t('filtro.nenhumResultado')}</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
    ${paginacao}
  `;
};

/* View "Dívidas" como componente Vue (Vue é DONO da view). */
(function () {
  'use strict';
  if (typeof window.MeuBolsoViews === 'undefined') window.MeuBolsoViews = {};
  window.MeuBolsoViews.dividas = {
    name: 'ViewDividas',
    computed: {
      html() {
        if (window.uiTick) window.uiTick.value;
        const fn = window.__mbRender && window.__mbRender.dividas;
        return fn ? fn() : '';
      }
    },
    render() { return Vue.h('div', { class: 'view', innerHTML: this.html }); }
  };
})();
