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
    // O gráfico (Chart.js) precisa ser (re)montado APÓS o Vue aplicar o novo
    // v-html no DOM. O render() global agenda montar() via nextTick, mas esse
    // nextTick pode rodar ANTES do patch do v-html — deixando o <canvas> novo
    // indisponível e o gráfico em branco. O hook updated() roda sempre DEPOIS
    // (Re)monta os gráficos APÓS o v-html ser aplicado no DOM (ver views/painel.js).
    // 'mounted' cobre o caso em que a view é aberta via setView (componente recém-montado);
    // 'updated' cobre re-renderizações (ex: inserir dívida estando já no painel).
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
