// Render function movida de app.js (S3-4). Script clássico carregado apos
// app.js: consome globais (estado, t, fmt, ICON, NIVEIS, escapeHtml, calcularMetricas,
// gerarInsights, window.api, etc.) e registra window.__mbRender.dividas.
window.__mbRender = window.__mbRender || {};
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
  return `
    <div class="page-header">
      <h2>${t('dividas.titulo')}</h2>
      <button class="btn btn-primary" data-acao="nova-divida">${ICON.mais} ${t('divida.nova')}</button>
    </div>
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
            ${estado.dividas.map(d => `
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
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
};

/* View "Dívidas" como componente Vue (Vue é DONO da view).
 * Substitui o renderDividas() vanilla: o app.js não chama mais
 * app.innerHTML = renderDividas(); o root Vue renderiza este componente
 * e ele mesmo injeta o HTML via v-html, reagindo ao uiTick.
 */
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
    template: '<div class="view" v-html="html"></div>'
  };
})();
