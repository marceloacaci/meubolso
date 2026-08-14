// Render function da Lixeira (recuperação de dívidas excluídas).
// Script clássico carregado após app.js: consome globais (estado, t, fmt, ICON,
// escapeHtml, CATEGORIAS) e registra window.__mbRender.lixeira.
window.__mbRender = window.__mbRender || {};
window.__mbRender.lixeira = function renderLixeira() {
  const itens = estado.lixeira.dividas || [];

  return `
    <div class="page-header">
      <h2>${t('lixeira.titulo')}</h2>
      ${itens.length > 0 ? `
        <button class="btn btn-outline-danger" data-acao="esvaziar-lixeira-tudo">${ICON.lixeira || ''} ${t('acao.esvaziar')}</button>
      ` : ''}
    </div>
    ${itens.length === 0 ? `
      <div class="alert alert-secondary d-flex align-items-center gap-2" role="status">
        <span style="font-size:18px">${ICON.lixeira || ''}</span>
        <div>${t('lixeira.vazia')}</div>
      </div>
    ` : `
      <div class="card shadow-sm">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>${t('col.divida')}</th>
                <th>${t('col.categoria')}</th>
                <th>${t('col.total')}</th>
                <th>${t('lixeira.excluidoEm')}</th>
                <th class="text-end">${t('col.acao')}</th>
              </tr>
            </thead>
            <tbody>
              ${itens.map(d => {
                const excluido = d._excluidoEm ? fmtData(d._excluidoEm.slice(0, 10)) : '';
                const total = (d.parcelas || []).reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
                return `
                  <tr>
                    <td>
                      <div class="fw-semibold">${escapeHtml(d.descricao)}</div>
                      <div class="text-secondary small">${escapeHtml(d.credor || '')}</div>
                    </td>
                    <td>${t(CATEGORIAS[d.categoria] ? CATEGORIAS[d.categoria].label : 'categoria.outro')}</td>
                    <td>${fmt.format(total)}</td>
                    <td class="text-secondary small">${excluido}</td>
                    <td class="text-end text-nowrap">
                      <button class="btn btn-sm btn-outline-primary" data-acao="restaurar-divida" data-id="${d.id}">${t('acao.restaurar')}</button>
                      <button class="btn btn-sm btn-outline-danger" data-acao="esvaziar-lixeira-divida" data-id="${d.id}">${t('acao.excluir')}</button>
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
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
