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
