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
  const temFiltro = f.texto || f.categoria || f.status || f.periodo || f.periodoDe || f.periodoAte;
  const tituloLimpar = temFiltro ? (t('filtro.limparTooltip') || 'Restaura todos os filtros') : (t('acao.limparFiltros') || 'Limpar filtros');
  const lupa = `<span class="input-lupa" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></span>`;
  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const optDia = (sel) => { let o='<option value="">'+t('filtro.dia')+'</option>'; for(let i=1;i<=31;i++) o+='<option value="'+i+'"'+(sel==String(i)?' selected':'')+'>'+i+'</option>'; return o; };
  const optMes = (sel) => { let o='<option value="">'+t('filtro.mes')+'</option>'; MESES.forEach((m,i)=>{ const v=String(i+1); o+='<option value="'+v+'"'+(sel==v?' selected':'')+'>'+m+'</option>'; }); return o; };
  const optAno = (sel) => { let o='<option value="">'+t('filtro.ano')+'</option>'; for(let a=2020;a<=2035;a++) o+='<option value="'+a+'"'+(sel==String(a)?' selected':'')+'>'+a+'</option>'; return o; };
  const deDia = f.periodoDeDia || (f.periodoDe||'').slice(8,10), deMes = f.periodoDeMes || (f.periodoDe||'').slice(5,7), deAno = f.periodoDeAno || (f.periodoDe||'').slice(0,4);
  const ateDia = f.periodoAteDia || (f.periodoAte||'').slice(8,10), ateMes = f.periodoAteMes || (f.periodoAte||'').slice(5,7), ateAno = f.periodoAteAno || (f.periodoAte||'').slice(0,4);
  const selPeriodo = (prefixo, dia, mes, ano) => `
    <div class="d-flex gap-1">
      <select class="form-select form-select-sm" style="width:auto" data-filtro="${prefixo}Dia">${optDia(dia)}</select>
      <select class="form-select form-select-sm" style="width:auto" data-filtro="${prefixo}Mes">${optMes(mes)}</select>
      <select class="form-select form-select-sm" style="width:auto" data-filtro="${prefixo}Ano">${optAno(ano)}</select>
    </div>`;
  return `
    <div class="card shadow-sm mb-3">
      <div class="card-body d-flex flex-wrap gap-2 align-items-end">
        <div class="flex-grow-1" style="min-width:200px">
          <label class="form-label small mb-1">${t('filtro.busca')}</label>
          <div class="input-com-lupa">
            ${lupa}
            <input id="busca" type="search" class="form-control campo-busca" placeholder="${t('filtro.buscaPlaceholder')}"
              value="${escapeHtml(f.texto || '')}" />
          </div>
        </div>
        <div>
          <label class="form-label small mb-1">${t('filtro.categoria')}</label>
          <select class="form-select" data-filtro="categoria">
            <option value="">${t('filtro.todas')}</option>${optsCat}
          </select>
        </div>
        <div>
          <label class="form-label small mb-1">${t('filtro.status')}</label>
          <select class="form-select" data-filtro="status">
            ${optsStatus}
          </select>
        </div>
        <div>
          <label class="form-label small mb-1">${t('filtro.ordenar')}</label>
          <select class="form-select" data-filtro="ordenar">
            ${optsOrd}
          </select>
        </div>
      </div>
      <div class="card-body d-flex flex-wrap gap-3 align-items-end border-top pt-2">
        <div>
          <label class="form-label small mb-1">${t('filtro.periodoDe')}</label>
          ${selPeriodo('periodoDe', deDia, deMes, deAno)}
        </div>
        <div>
          <label class="form-label small mb-1">${t('filtro.periodoAte')}</label>
          ${selPeriodo('periodoAte', ateDia, ateMes, ateAno)}
        </div>
        <div class="ms-auto">
          <label class="form-label small mb-1">&nbsp;</label>
          <button class="btn btn-limpar-filtros ${temFiltro ? 'ativo' : ''}" data-acao="limpar-filtro" title="${tituloLimpar}" ${temFiltro ? '' : 'disabled'}>${ICON.lixeira || '🗑'} ${t('acao.limparFiltros')}</button>
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
        <button class="gear-opt gear-opt--sm" data-acao="editar-divida" data-id="${d.id}">${t('acao.editar')}</button>
        <button class="gear-opt gear-opt--sm gear-opt--danger" data-acao="excluir-divida" data-id="${d.id}">${t('acao.excluir')}</button>
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
