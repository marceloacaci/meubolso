/* View "Sobre" como componente Vue (Vue é DONO da view).
 * O renderSobre() depende de _sobreInfoCache (preenchido via IPC).
 * Como o computed lê window.uiTick, qualquer render() disparado após
 * obter as informações do sistema força o recálculo e exibe os dados.
 */
(function () {
  'use strict';
  if (typeof window.MeuBolsoViews === 'undefined') window.MeuBolsoViews = {};
  window.MeuBolsoViews.sobre = {
    name: 'ViewSobre',
    computed: {
      html() {
        if (window.uiTick) window.uiTick.value;
        const fn = window.__mbRender && window.__mbRender.sobre;
        return fn ? fn() : '';
      }
    },
    template: '<div class="view" v-html="html"></div>'
  };
})();
