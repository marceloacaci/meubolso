// Render function movida de app.js (S3-4) e estendida (S5-1 busca/filtros).
// Script clássico carregado apos app.js: consome globais (estado, t, fmt, ICON,
// NIVEIS, escapeHtml, calcularVencimentos, normalizarTexto, definirFiltro,
// limparFiltro, window.api, etc.) e registra window.__mbRender.vencimentos.
window.__mbRender = window.__mbRender || {};
function renderPainelFiltrosVencimentos() {
  const f = estado.filtro || {};
  const optsCat = ['servico', 'cartao', 'emprestimo', 'outro']
    .map(
      (c) =>
        `<option value="${c}"${f.categoria === c ? ' selected' : ''}>${t(CATEGORIAS[c]?.label) || c}</option>`
    )
    .join('');
  const optsStatus = [
    ['', t('filtro.todos')],
    ['emDia', t('filtro.emDia')],
    ['atrasado', t('filtro.atrasado')],
    ['quitado', t('filtro.quitado')],
  ]
    .map(([v, l]) => `<option value="${v}"${f.status === v ? ' selected' : ''}>${l}</option>`)
    .join('');
  const optsOrd = [
    ['vencimento', t('ord.vencimento')],
    ['descricao', t('ord.descricao')],
    ['valor', t('ord.valor')],
  ]
    .map(([v, l]) => `<option value="${v}"${f.ordenar === v ? ' selected' : ''}>${l}</option>`)
    .join('');
  const temFiltro = f.texto || f.categoria || f.status || f.periodo || f.periodoDe || f.periodoAte;
  const tituloLimpar = temFiltro
    ? t('filtro.limparTooltip') || 'Restaura todos os filtros'
    : t('acao.limparFiltros') || 'Limpar filtros';
  const lupa = `<span class="input-lupa" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></span>`;
  const MESES = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ];
  const optDia = (sel) => {
    let o = '<option value="">' + t('filtro.dia') + '</option>';
    for (let i = 1; i <= 31; i++)
      o +=
        '<option value="' + i + '"' + (sel == String(i) ? ' selected' : '') + '>' + i + '</option>';
    return o;
  };
  const optMes = (sel) => {
    let o = '<option value="">' + t('filtro.mes') + '</option>';
    MESES.forEach((m, i) => {
      const v = String(i + 1);
      o += '<option value="' + v + '"' + (sel == v ? ' selected' : '') + '>' + m + '</option>';
    });
    return o;
  };
  const optAno = (sel) => {
    let o = '<option value="">' + t('filtro.ano') + '</option>';
    for (let a = 2020; a <= 2035; a++)
      o +=
        '<option value="' + a + '"' + (sel == String(a) ? ' selected' : '') + '>' + a + '</option>';
    return o;
  };
  const deDia = f.periodoDeDia || (f.periodoDe || '').slice(8, 10),
    deMes = f.periodoDeMes || (f.periodoDe || '').slice(5, 7),
    deAno = f.periodoDeAno || (f.periodoDe || '').slice(0, 4);
  const ateDia = f.periodoAteDia || (f.periodoAte || '').slice(8, 10),
    ateMes = f.periodoAteMes || (f.periodoAte || '').slice(5, 7),
    ateAno = f.periodoAteAno || (f.periodoAte || '').slice(0, 4);
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
    ${
      itens.length === 0
        ? `
      <div class="alert ${atrasada ? 'alert-danger' : 'alert-success'} d-flex align-items-center gap-2" role="status">
        <span style="font-size:18px">${ICON.check}</span>
        <div>${vazio}</div>
      </div>
    `
        : `
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
              ${itens.map((i) => linha(i, atrasada)).join('')}
            </tbody>
          </table>
        </div>
      </div>`
    }`;

  return `
    <div class="page-header"><h2>${ICON.vencimentos} ${t('vencimentos.titulo')}</h2></div>
    ${renderPainelFiltrosVencimentos()}
    ${bloco(t('vencimentos.atrasadas'), atrasadas, true, t('vencimentos.nenhumaAtrasada'))}
    ${bloco(t('vencimentos.proximas'), proximas, false, t('vencimentos.nenhumaProxima'))}
  `;
};
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
      },
    },
    render() {
      return Vue.h('div', { class: 'view', innerHTML: this.html });
    },
  };
})();
