// Render function movida de app.js (S3-4). Script clássico carregado apos
// app.js: consome globais (estado, t, fmt, ICON, NIVEIS, escapeHtml, calcularMetricas,
// gerarInsights, window.api, etc.) e registra window.__mbRender.pagamentos.
window.__mbRender = window.__mbRender || {};
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
  // Agrupa dívidas que possuem ao menos um pagamento (receberam pagamento).
  const comPagamento = estado.dividas.filter(d =>
    estado.pagamentos.some(p => p.dividaId === d.id && (d.parcelas || []).some(pc => pc.id === p.parcelaId))
  );

  const blocoDivida = (d) => {
    const r = resumoParcelas(d);
    const pagosDesta = estado.pagamentos
      .filter(p => p.dividaId === d.id && (d.parcelas || []).some(pc => pc.id === p.parcelaId))
      .sort((a, b) => {
        const na = (d.parcelas || []).find(pc => pc.id === a.parcelaId)?.numero || 0;
        const nb = (d.parcelas || []).find(pc => pc.id === b.parcelaId)?.numero || 0;
        return na - nb;
      });
    return `
      <div class="cartao-divida">
        <div class="barra-progresso" title="${r.percentualPago}% pago" aria-label="${r.percentualPago}% pago">
          <div class="barra-progresso-preenchimento" style="width:${r.percentualPago}%"></div>
          <span class="barra-progresso-texto">${r.percentualPago}%</span>
        </div>
        <div class="divida-cabecalho">
          <div>
            <div class="titulo">${escapeHtml(d.descricao)}</div>
            <div class="subtitulo">${escapeHtml(d.credor || '')} · ${t(CATEGORIAS[d.categoria]?.label) || d.categoria}</div>
          </div>
          <button class="btn btn-primary" style="font-size:12px;padding:4px 10px" data-acao="gerenciar-pagamentos" data-id="${d.id}">${t('pagamento.gerenciar')}</button>
        </div>
        <div class="divida-resumo">
          <div class="campo"><label>${t('label.parcelasPagas')}</label><span>${r.pagas} de ${r.total}</span></div>
          <div class="campo"><label>${t('label.valorPago')}</label><span>${fmt.format(r.valorPago)} de ${fmt.format(r.valorTotal)}</span></div>
          <div class="campo"><label>${t('label.restante')}</label><span>${fmt.format(r.valorRestante)}</span></div>
          <div class="campo"><label>${t('label.pagoTotal')}</label><span>${r.percentualPago}%</span></div>
          <div class="campo"><label>${t('label.restanteTotal')}</label><span>${r.percentualRestante}%</span></div>
        </div>
        <div class="card shadow-sm mt-2">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>${t('col.parcela')}</th>
                  <th>${t('label.valorPago')}</th>
                  <th>${t('form.data')}</th>
                  <th>${t('form.nota')}</th>
                  <th class="text-end">${t('col.acao')}</th>
                </tr>
              </thead>
              <tbody>
                ${pagosDesta.map(p => {
                  const parc = (d.parcelas || []).find(x => x.id === p.parcelaId);
                  return `
                    <tr>
                      <td>
                        <div class="fw-semibold">${parc ? 'Parcela ' + parc.numero : '(parcela)'}</div>
                        <div class="text-secondary small">${escapeHtml(d.credor || '')}</div>
                      </td>
                      <td class="text-success">${fmt.format(p.valor)}</td>
                      <td>${fmtData(p.data)}</td>
                      <td>${escapeHtml(p.nota || '')}</td>
                      <td class="text-end text-nowrap">
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

  return `
    <div class="page-header">
      <h2>${t('pagamentos.titulo')}</h2>
      <button class="btn btn-primary" data-acao="novo-pagamento">${ICON.mais} ${t('pagamento.novo')}</button>
    </div>
    ${comPagamento.length === 0 ? `
      <div class="alert alert-secondary d-flex align-items-center gap-2" role="status">
        <span style="font-size:20px">${ICON.dinheiro}</span>
        <div>${t('empty.pagamentos2')}<br/>${t('empty.pagamentos3')}</div>
      </div>
    ` : comPagamento.map(blocoDivida).join('')}
  `;
};

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
