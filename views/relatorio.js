/* View "Relatório" como componente Vue (Vue é DONO da view). */
(function () {
  'use strict';
  if (typeof window.MeuBolsoViews === 'undefined') window.MeuBolsoViews = {};
  window.MeuBolsoViews.relatorio = {
    name: 'ViewRelatorio',
    computed: {
      html() {
        if (window.uiTick) window.uiTick.value;
        const fn = window.__mbRender && window.__mbRender.relatorio;
        return fn ? fn() : '';
      }
    },
    // (Re)monta os gráficos APÓS o v-html ser aplicado no DOM (ver views/painel.js).
    // 'mounted' cobre abertura via setView; 'updated' cobre re-renderizações.
    mounted() {
      if (typeof Vue !== 'undefined' && window.ChartGraficos) {
        try { window.ChartGraficos.montar(); } catch (_) {}
      }
    },
    updated() {
      if (typeof Vue !== 'undefined' && window.ChartGraficos) {
        try { window.ChartGraficos.montar(); } catch (_) {}
      }
    },
    template: '<div class="view" v-html="html"></div>'
  };
})();
