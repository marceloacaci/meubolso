// Render function da Lixeira (recuperação de itens excluídos: dívidas,
// carteiras, recorrentes e metas).
// Script clássico carregado após app.js: consome globais (estado, t, fmt, ICON,
// escapeHtml, CATEGORIAS) e registra window.__mbRender.lixeira.
window.__mbRender = window.__mbRender || {};
window.__mbRender.lixeira = function renderLixeira() {
  const L = estado.lixeira || { dividas: [], pagamentos: [], carteiras: [], recorrentes: [], metas: [] };
  const total = L.dividas.length + L.carteiras.length + L.recorrentes.length + L.metas.length;

  const fmtDataExcl = (iso) => iso ? fmtData(String(iso).slice(0, 10)) : '';

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

  // Linhas da seção Carteiras.
  const linhasCarteiras = (L.carteiras || []).map(c => `
    <tr>
      <td class="fw-semibold">${escapeHtml(c.nome)}</td>
      <td>${fmt.format(Number(c.saldo) || 0)}</td>
      <td class="text-secondary small">${fmtDataExcl(c._excluidoEm)}</td>
      <td class="text-end text-nowrap">
        <button class="btn btn-sm btn-outline-primary" data-acao="restaurar-carteira" data-id="${c.id}">${t('acao.restaurar')}</button>
        <button class="btn btn-sm btn-outline-danger" data-acao="esvaziar-lixeira-carteira" data-id="${c.id}">${t('acao.excluir')}</button>
      </td>
    </tr>`).join('');

  // Linhas da seção Recorrentes.
  const linhasRecorrentes = (L.recorrentes || []).map(r => `
    <tr>
      <td class="fw-semibold">${escapeHtml(r.descricao)}</td>
      <td>${t(RECORRENTE_CATS[r.categoria] ? RECORRENTE_CATS[r.categoria].label : 'categoria.outro')}</td>
      <td>${fmt.format(Number(r.valor) || 0)}</td>
      <td class="text-secondary small">${fmtDataExcl(r._excluidoEm)}</td>
      <td class="text-end text-nowrap">
        <button class="btn btn-sm btn-outline-primary" data-acao="restaurar-recorrente" data-id="${r.id}">${t('acao.restaurar')}</button>
        <button class="btn btn-sm btn-outline-danger" data-acao="esvaziar-lixeira-recorrente" data-id="${r.id}">${t('acao.excluir')}</button>
      </td>
    </tr>`).join('');

  // Linhas da seção Metas.
  const linhasMetas = (L.metas || []).map(m => `
    <tr>
      <td class="fw-semibold">${escapeHtml(m.titulo)}</td>
      <td>${fmt.format(Number(m.valorAlvo) || 0)}</td>
      <td class="text-secondary small">${fmtDataExcl(m._excluidoEm)}</td>
      <td class="text-end text-nowrap">
        <button class="btn btn-sm btn-outline-primary" data-acao="restaurar-meta" data-id="${m.id}">${t('acao.restaurar')}</button>
        <button class="btn btn-sm btn-outline-danger" data-acao="esvaziar-lixeira-meta" data-id="${m.id}">${t('acao.excluir')}</button>
      </td>
    </tr>`).join('');

  const secao = (titulo, icone, colunas, linhas) => {
    if (!linhas) return '';
    return `
      <h3 class="h6 text-secondary mt-4 mb-2">${icone} ${titulo}</h3>
      <div class="card shadow-sm">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead><tr>${colunas.map(c => `<th>${c}</th>`).join('')}</tr></thead>
            <tbody>${linhas}</tbody>
          </table>
        </div>
      </div>`;
  };

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
      ${secao(t('lixeira.secaoDividas'), ICON.lixeira || '', [t('col.divida'), t('col.categoria'), t('col.total'), t('lixeira.excluidoEm'), t('col.acao')], linhasDividas)}
      ${secao(t('lixeira.secaoCarteiras'), ICON.carteira || '', [t('col.nome'), t('col.saldo'), t('lixeira.excluidoEm'), t('col.acao')], linhasCarteiras)}
      ${secao(t('lixeira.secaoRecorrentes'), ICON.recorrente || '', [t('col.descricao'), t('col.categoria'), t('col.valor'), t('lixeira.excluidoEm'), t('col.acao')], linhasRecorrentes)}
      ${secao(t('lixeira.secaoMetas'), ICON.meta || '', [t('col.titulo'), t('col.valorAlvo'), t('lixeira.excluidoEm'), t('col.acao')], linhasMetas)}
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
