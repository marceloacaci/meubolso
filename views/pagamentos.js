// Render function movida de app.js (S3-4) e estendida (S5-1 busca, S5-5
// paginação). Script clássico carregado após app.js: consome globais
// (estado, t, fmt, ICON, CATEGORIAS, escapeHtml, resumoParcelas, fmtData,
// filtrarPagamentos, paginar) e registra window.__mbRender.pagamentos.
window.__mbRender = window.__mbRender || {};

function renderPainelFiltrosPagamentos() {
  const f = estado.filtro || {};
  const optsCat = ['servico', 'cartao', 'emprestimo', 'outro'].map(c =>
    `<option value="${c}"${f.categoria === c ? ' selected' : ''}>${t(CATEGORIAS[c]?.label) || c}</option>`).join('');
  const optsDiv = estado.dividas.map(d =>
    `<option value="${d.id}"${f.dividaId === d.id ? ' selected' : ''}>${escapeHtml(d.descricao)}</option>`).join('');
  const temFiltro = f.texto || f.categoria || f.dividaId || f.periodo || f.periodoDe || f.periodoAte;
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
            <input type="search" class="form-control campo-busca" placeholder="${t('filtro.buscaPlaceholder')}"
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
          <label class="form-label small mb-1">${t('filtro.divida')}</label>
          <select class="form-select" data-filtro="dividaId">
            <option value="">${t('filtro.todas')}</option>${optsDiv}
          </select>
        </div>
        <div>
          <label class="form-label small mb-1">&nbsp;</label>
          <button class="btn btn-limpar-filtros ${temFiltro ? 'ativo' : ''}" data-acao="limpar-filtro" title="${tituloLimpar}" ${temFiltro ? '' : 'disabled'}>${ICON.lixeira || '🗑'} ${t('acao.limparFiltros')}</button>
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
  const porParcela = {}; // dividaId|parcelaId -> [pagamentos]
  for (const p of filtrados) {
    if (!porDivida[p.dividaId]) porDivida[p.dividaId] = [];
    porDivida[p.dividaId].push(p);
    const chave = p.dividaId + '|' + p.parcelaId;
    if (!porParcela[chave]) porParcela[chave] = [];
    porParcela[chave].push(p);
  }
  const idsComPagamento = Object.keys(porDivida);

  const blocoDivida = (d, pagosDesta) => {
    const r = resumoParcelas(d);
    const ordenados = pagosDesta.sort((a, b) => {
      const na = (d.parcelas || []).find(pc => pc.id === a.parcelaId)?.numero || 0;
      const nb = (d.parcelas || []).find(pc => pc.id === b.parcelaId)?.numero || 0;
      return na - nb;
    });
    // Soma de pagamentos por parcela (para exibir saldo de cada parcela).
    const pagosPorParcela = {};
    for (const p of pagosDesta) {
      pagosPorParcela[p.parcelaId] = (pagosPorParcela[p.parcelaId] || 0) + (Number(p.valor) || 0);
    }
    return `
      <div class="cartao-divida">
        <div class="barra-progresso" title="${r.percentualPago}% pago" aria-label="${r.percentualPago}% pago">
          <div class="barra-progresso-preenchimento" style="width:${r.percentualPago}%"></div>
          <span class="barra-progresso-texto">${r.percentualPago}%</span>
        </div>
        <div class="barra-progresso-valor text-secondary small mt-1">
          ${t('label.valorPago')}: <strong class="text-success">${fmt.format(r.valorPago)}</strong> / ${fmt.format(r.valorTotal)}
        </div>
        <div class="barra-progresso-valor text-secondary small mt-1">
          ${t('pagamentos.saldoTotal')}: <strong class="text-danger">${fmt.format(r.valorRestante)}</strong>
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
                <th>${t('label.valor')}</th>
                <th>${t('label.valorPago')}</th>
                <th>${t('pagamentos.saldoParcela')}</th>
                <th class="text-end">${t('col.acao')}</th>
              </tr></thead>
              <tbody>
                ${(d.parcelas || []).map(parc => {
                  const pagoParc = pagosPorParcela[parc.id] || 0;
                  const restanteParc = (Number(parc.valor) || 0) - pagoParc;
                  const pagosParc = porParcela[d.id + '|' + parc.id] || [];
                  const acoes = pagosParc.map(p => `
                    <div class="d-flex gap-1 justify-content-end mb-1">
                      <button class="btn btn-sm btn-outline-secondary" data-acao="editar-pagamento" data-id="${p.id}">${t('acao.editar')}</button>
                      <button class="btn btn-sm btn-outline-danger" data-acao="excluir-pagamento" data-id="${p.id}">${t('acao.excluir')}</button>
                    </div>`).join('');
                  const registrar = `
                    <button class="btn btn-sm btn-primary" data-acao="gerenciar-pagamentos" data-id="${d.id}">${t('pagamento.registrar')}</button>`;
                  return `
                    <tr>
                      <td><div class="fw-semibold">${t('label.parcela')} ${parc.numero}</div>
                      <div class="text-secondary small">${escapeHtml(d.credor || '')}</div></td>
                      <td>${fmt.format(parc.valor)}</td>
                      <td class="text-success">${pagoParc > 0 ? fmt.format(pagoParc) : '—'}</td>
                      <td>${restanteParc > 0 ? `<span class="text-danger">${fmt.format(restanteParc)}</span>` : `<span class="text-success">${t('pagamentos.quitada')}</span>`}</td>
                      <td class="text-end text-nowrap">${pagosParc.length ? acoes : registrar}</td>
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
    render() { return Vue.h('div', { class: 'view', innerHTML: this.html }); }
  };
})();
