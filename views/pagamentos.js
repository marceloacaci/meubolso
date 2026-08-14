// Render function movida de app.js (S3-4) e estendida (S5-1 busca, S5-5
// paginação). Script clássico carregado após app.js: consome globais
// (estado, t, fmt, ICON, CATEGORIAS, escapeHtml, resumoParcelas, fmtData,
// filtrarPagamentos, paginar) e registra window.__mbRender.pagamentos.
window.__mbRender = window.__mbRender || {};

function renderPainelFiltrosPagamentos() {
  const f = estado.filtro || {};
  const optsDiv = estado.dividas.map(d =>
    `<option value="${d.id}"${f.dividaId === d.id ? ' selected' : ''}>${escapeHtml(d.descricao)}</option>`).join('');
  const temFiltro = f.texto || f.dividaId || f.periodo;
  return `
    <div class="card shadow-sm mb-3">
      <div class="card-body d-flex flex-wrap gap-2 align-items-end">
        <div class="flex-grow-1" style="min-width:200px">
          <label class="form-label small mb-1">${t('filtro.busca')}</label>
          <input type="search" class="form-control" placeholder="${t('filtro.buscaPlaceholder')}"
            value="${escapeHtml(f.texto || '')}" oninput="definirFiltro('texto', this.value)" />
        </div>
        <div>
          <label class="form-label small mb-1">${t('filtro.categoria')}</label>
          <select class="form-select" onchange="definirFiltro('dividaId', this.value)">
            <option value="">${t('filtro.todas')}</option>${optsDiv}
          </select>
        </div>
        <div>
          <label class="form-label small mb-1">${t('filtro.periodo')}</label>
          <input type="month" class="form-control" value="${escapeHtml(f.periodo || '')}" onchange="definirFiltro('periodo', this.value)" />
        </div>
        <div>
          <label class="form-label small mb-1">&nbsp;</label>
          <button class="btn btn-outline-secondary d-block" data-acao="limpar-filtro" ${temFiltro ? '' : 'disabled'}>${t('acao.limpar')}</button>
        </div>
      </div>
    </div>`;
}

window.__mbRender.pagamentos = function renderPagamentos() {
  if (estado.dividas.length === 0) {
    return `
      <div class="page-header">
        <h2>${t('pagamentos.titulo')}</h2>
        <button class="btn btn-primary" data-acao="novo-pagamento">${t('pagamento.novo')}</button>
      </div>
      <div class="lista"><div class="empty">
        <div class="emoji">${ICON.dinheiro}</div>
        <div>${t('empty.pagamentos1')}</div>
      </div></div>
    `;
  }
  const f = estado.filtro || {};
  const filtrados = filtrarPagamentos(estado.pagamentos, estado.dividas, f);
  // Agrupa por dívida (mantém o formato de cartão por dívida).
  const porDivida = {};
  for (const p of filtrados) {
    if (!porDivida[p.dividaId]) porDivida[p.dividaId] = [];
    porDivida[p.dividaId].push(p);
  }
  const idsComPagamento = Object.keys(porDivida);

  const blocoDivida = (d, pagosDesta) => {
    const r = resumoParcelas(d);
    const ordenados = pagosDesta.sort((a, b) => {
      const na = (d.parcelas || []).find(pc => pc.id === a.parcelaId)?.numero || 0;
      const nb = (d.parcelas || []).find(pc => pc.id === b.parcelaId)?.numero || 0;
      return na - nb;
    });
    return `
      <div class="cartao-divida">
        <div class="barra-progresso" title="${r.percentualPago}% pago" aria-label="${r.percentualPago}% pago">
          <div class="barra-progreso-preenchimento" style="width:${r.percentualPago}%"></div>
          <span class="barra-progreso-texto">${r.percentualPago}%</span>
        </div>
        <div class="divida-cabecalho">
          <div>
            <div class="titulo">${escapeHtml(d.descricao)}</div>
            <div class="subtitulo">${escapeHtml(d.credor || '')} · ${t(CATEGORIAS[d.categoria]?.label) || d.categoria}</div>
          </div>
          <button class="btn btn-primary" style="font-size:12px;padding:4px 10px" data-acao="gerenciar-pagamentos" data-id="${d.id}">${t('pagamento.gerenciar')}</button>
        </div>
        <div class="card shadow-sm mt-2">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead><tr>
                <th>${t('col.parcela')}</th>
                <th>${t('label.valorPago')}</th>
                <th>${t('form.data')}</th>
                <th>${t('form.nota')}</th>
                <th class="text-end">${t('col.acao')}</th>
              </tr></thead>
              <tbody>
                ${ordenados.map(p => {
                  const parc = (d.parcelas || []).find(x => x.id === p.parcelaId);
                  return `
                    <tr>
                      <td><div class="fw-semibold">${parc ? 'Parcela ' + parc.numero : '(parcela)'}</div>
                      <div class="text-secondary small">${escapeHtml(d.credor || '')}</div></td>
                      <td class="text-success">${fmt.format(p.valor)}</td>
                      <td>${fmtData(p.data)}</td>
                      <td>${escapeHtml(p.nota || '')}</td>
                      <td class="text-end text-nowrap">
                        ${p.anexo ? `<button class="btn btn-sm btn-outline-info" data-acao="abrir-anexo" data-id="${p.id}" title="${escapeHtml(p.anexo)}">${ICON.anexo || '📎'}</button>` : ''}
                        <button class="btn btn-sm btn-outline-secondary" data-acao="anexar-anexo" data-id="${p.id}">${t('acao.anexar')}</button>
                        <button class="btn btn-sm btn-outline-secondary" data-acao="editar-pagamento" data-id="${p.id}">${t('acao.editar')}</button>
                        <button class="btn btn-sm btn-outline-danger" data-acao="excluir-pagamento" data-id="${p.id}">${t('acao.excluir')}</button>
                      </td>
                    </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  };

  const pg = paginar(idsComPagamento, f.pagina || 1, f.porPagina || 12);
  const cartoes = pg.itens.map(id => {
    const d = estado.dividas.find(x => x.id === id);
    return d ? blocoDivida(d, porDivida[id]) : '';
  }).join('');

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
      <h2>${t('pagamentos.titulo')}</h2>
      <button class="btn btn-primary" data-acao="novo-pagamento">${ICON.mais} ${t('pagamento.novo')}</button>
    </div>
    ${renderPainelFiltrosPagamentos()}
    ${idsComPagamento.length === 0 ? `
      <div class="alert alert-secondary d-flex align-items-center gap-2" role="status">
        <span style="font-size:20px">${ICON.dinheiro}</span>
        <div>${t('filtro.nenhumResultado')}</div>
      </div>
    ` : cartoes + paginacao}
  `;
};

/* View "Pagamentos" como componente Vue (Vue é DONO da view). */
(function () {
  'use strict';
  if (typeof window.MeuBolsoViews === 'undefined') window.MeuBolsoViews = {};
  window.MeuBolsoViews.pagamentos = {
    name: 'ViewPagamentos',
    computed: {
      html() {
        if (window.uiTick) window.uiTick.value;
        const fn = window.__mbRender && window.__mbRender.pagamentos;
        return fn ? fn() : '';
      }
    },
    template: '<div class="view" v-html="html"></div>'
  };
})();
