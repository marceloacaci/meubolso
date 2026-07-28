/* View "Painel" como componente Vue (Vue é DONO da view).
 * O template é fino: apenas injeta o HTML gerado por renderPainel()
 * (função pura do app.js, exposta em window.__mbRender). A reatividade
 * vem de window.uiTick — qualquer ação que antes chamava render() agora
 * incrementa o tick, e este computed recalcula sozinho (sem congelamento).
 */
(function () {
  'use strict';
  if (typeof window.MeuBolsoViews === 'undefined') window.MeuBolsoViews = {};
  window.MeuBolsoViews.painel = {
    name: 'ViewPainel',
    computed: {
      html() {
        if (window.uiTick) window.uiTick.value; // registra dependência reativa
        const fn = window.__mbRender && window.__mbRender.painel;
        return fn ? fn() : '';
      }
    },
    template: '<div class="view" v-html="html"></div>'
  };
})();
