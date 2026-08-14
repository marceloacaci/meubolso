// Render function da Lixeira (recuperação de itens excluídos: dívidas,
// carteiras, recorrentes e metas).
// Script clássico carregado após app.js: consome globais (estado, t, fmt, ICON,
// escapeHtml, CATEGORIAS, RECORRENTE_CATS) e registra window.__mbRender.lixeira.
window.__mbRender = window.__mbRender || {};
window.__mbRender.lixeira = function renderLixeira() {
  const L = estado.lixeira || { dividas: [], pagamentos: [], carteiras: [], recorrentes: [], metas: [] };
  const total = L.dividas.length + L.carteiras.length + L.recorrentes.length + L.metas.length;

  const fmtDataExcl = (iso) => iso ? fmtData(String(iso).slice(0, 10)) : '';
  const badge = (n) => n > 0 ? ` <span class="badge bg-secondary rounded-pill">${n}</span>` : '';

  // Linhas da seção Dívidas (com pagamentos vinculados na lixeira).
  const linhasDividas = (L.dividas || []).map(d => {
    const totalD = (d.parcelas || []).reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
    return `
      <tr>
        <td>
          <div class="fw-semibold">${escapeHtml(d.descricao)}</div>
          <div class="text-secondary small">${escapeHtml(d.credor || '')}</div>
        </td>
        <td>${t(CATEGORIAS[d.categoria] ? CATEGORIAS[d.categoria].label : 'categoria.outro')}</td>
        <td>${fmt.format(totalD)}</td>
        <td class="text-secondary small">${fmtDataExcl(d._excluidoEm)}</td>
        <td class="text-end text-nowrap">
          <button class="btn btn-sm btn-outline-primary" data-acao="restaurar-divida" data-id="${d.id}">${t('acao.restaurar')}</button>
          <button class="btn btn-sm btn-outline-danger" data-acao="esvaziar-lixeira-divida" data-id="${d.id}">${t('acao.excluir')}</button>
        </td>
      </tr>`;
  }).join('');

  const tabela = (colunas, linhas) => linhas ? `
    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead><tr>${colunas.map(c => `<th>${c}</th>`).join('')}</tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>` : `
    <div class="text-secondary small py-2">${t('lixeira.vazia')}</div>`;

  // Conteúdo de cada aba (tab-pane).
  const pane = (id, active, colunas, linhas) => `
    <div class="tab-pane fade ${active ? 'show active' : ''}" id="lix-${id}" role="tabpanel">
      <div class="card shadow-sm mt-3">
        ${tabela(colunas, linhas)}
      </div>
    </div>`;

  const painelDividas = pane('dividas', true,
    [t('col.divida'), t('col.categoria'), t('col.total'), t('lixeira.excluidoEm'), t('col.acao')],
    linhasDividas);

  const painelCarteiras = pane('carteiras', false,
    [t('col.nome'), t('col.saldo'), t('lixeira.excluidoEm'), t('col.acao')],
    (L.carteiras || []).map(c => `
      <tr>
        <td class="fw-semibold">${escapeHtml(c.nome)}</td>
        <td>${fmt.format(Number(c.saldo) || 0)}</td>
        <td class="text-secondary small">${fmtDataExcl(c._excluidoEm)}</td>
        <td class="text-end text-nowrap">
          <button class="btn btn-sm btn-outline-primary" data-acao="restaurar-carteira" data-id="${c.id}">${t('acao.restaurar')}</button>
          <button class="btn btn-sm btn-outline-danger" data-acao="esvaziar-lixeira-carteira" data-id="${c.id}">${t('acao.excluir')}</button>
        </td>
      </tr>`).join(''));

  const painelRecorrentes = pane('recorrentes', false,
    [t('col.descricao'), t('col.categoria'), t('col.valor'), t('lixeira.excluidoEm'), t('col.acao')],
    (L.recorrentes || []).map(r => `
      <tr>
        <td class="fw-semibold">${escapeHtml(r.descricao)}</td>
        <td>${t(RECORRENTE_CATS[r.categoria] ? RECORRENTE_CATS[r.categoria].label : 'categoria.outro')}</td>
        <td>${fmt.format(Number(r.valor) || 0)}</td>
        <td class="text-secondary small">${fmtDataExcl(r._excluidoEm)}</td>
        <td class="text-end text-nowrap">
          <button class="btn btn-sm btn-outline-primary" data-acao="restaurar-recorrente" data-id="${r.id}">${t('acao.restaurar')}</button>
          <button class="btn btn-sm btn-outline-danger" data-acao="esvaziar-lixeira-recorrente" data-id="${r.id}">${t('acao.excluir')}</button>
        </td>
      </tr>`).join(''));

  const painelMetas = pane('metas', false,
    [t('col.titulo'), t('col.valorAlvo'), t('lixeira.excluidoEm'), t('col.acao')],
    (L.metas || []).map(m => `
      <tr>
        <td class="fw-semibold">${escapeHtml(m.titulo)}</td>
        <td>${fmt.format(Number(m.valorAlvo) || 0)}</td>
        <td class="text-secondary small">${fmtDataExcl(m._excluidoEm)}</td>
        <td class="text-end text-nowrap">
          <button class="btn btn-sm btn-outline-primary" data-acao="restaurar-meta" data-id="${m.id}">${t('acao.restaurar')}</button>
          <button class="btn btn-sm btn-outline-danger" data-acao="esvaziar-lixeira-meta" data-id="${m.id}">${t('acao.excluir')}</button>
        </td>
      </tr>`).join(''));

  return `
    <div class="page-header">
      <h2>${t('lixeira.titulo')}</h2>
      ${total > 0 ? `
        <button class="btn btn-outline-danger" data-acao="esvaziar-lixeira-tudo">${ICON.lixeira || ''} ${t('acao.esvaziar')}</button>
      ` : ''}
    </div>
    ${total === 0 ? `
      <div class="alert alert-secondary d-flex align-items-center gap-2" role="status">
        <span style="font-size:18px">${ICON.lixeira || ''}</span>
        <div>${t('lixeira.vazia')}</div>
      </div>
    ` : `
      <ul class="nav nav-tabs" role="tablist">
        <li class="nav-item" role="presentation">
          <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#lix-dividas" type="button" role="tab">${t('lixeira.secaoDividas')}${badge(L.dividas.length)}</button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link" data-bs-toggle="tab" data-bs-target="#lix-carteiras" type="button" role="tab">${t('lixeira.secaoCarteiras')}${badge(L.carteiras.length)}</button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link" data-bs-toggle="tab" data-bs-target="#lix-recorrentes" type="button" role="tab">${t('lixeira.secaoRecorrentes')}${badge(L.recorrentes.length)}</button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link" data-bs-toggle="tab" data-bs-target="#lix-metas" type="button" role="tab">${t('lixeira.secaoMetas')}${badge(L.metas.length)}</button>
        </li>
      </ul>
      <div class="tab-content">
        ${painelDividas}
        ${painelCarteiras}
        ${painelRecorrentes}
        ${painelMetas}
      </div>
    `}
  `;
};

/* View "Lixeira" como componente Vue (Vue é DONO da view). */
(function () {
  'use strict';
  if (typeof window.MeuBolsoViews === 'undefined') window.MeuBolsoViews = {};
  window.MeuBolsoViews.lixeira = {
    name: 'ViewLixeira',
    computed: {
      html() {
        if (window.uiTick) window.uiTick.value;
        const fn = window.__mbRender && window.__mbRender.lixeira;
        return fn ? fn() : '';
      }
    },
    render() { return Vue.h('div', { class: 'view', innerHTML: this.html }); }
  };
})();
