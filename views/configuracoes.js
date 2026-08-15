// Render function movida de app.js (S3-4). Script clássico carregado apos
// app.js: consome globais (estado, t, fmt, ICON, NIVEIS, escapeHtml, calcularMetricas,
// gerarInsights, window.api, etc.) e registra window.__mbRender.configuracoes.
window.__mbRender = window.__mbRender || {};
window.__mbRender.configuracoes = function renderConfiguracoes() {
  const fs = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-font-scale')) || 1;
  const tamFonte = fs > 1.15 ? 'Grande' : fs < 0.95 ? 'Pequena' : 'Padrão';
  return `
    <div class="page-header"><h2>${t('config.titulo')}</h2></div>
    <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3" style="max-width:1000px">
      <div class="col">
        <section class="config-secao h-100">
          <h3>${t('config.aparencia')}</h3>
          <div class="config-linha">
            <span>${t('config.tema')}</span>
            <div class="gear-grupo" role="group" aria-label="${t('config.tema')}">
              <button class="gear-opt ${temaAtual === 'light' ? 'active' : ''}" data-tema="light" title="${t('tema.claroTitle')}">${ICON.sol} ${t('tema.claro')}</button>
              <button class="gear-opt ${temaAtual === 'dark' ? 'active' : ''}" data-tema="dark" title="${t('tema.escuroTitle')}">${ICON.lua} ${t('tema.escuro')}</button>
            </div>
          </div>
          <div class="config-linha">
            <span>${t('config.fonte')} (${tamFonte})</span>
            <div class="gear-grupo gear-fonte-btns" role="group" aria-label="${t('config.fonte')}">
              <button class="gear-opt gear-fonte" data-fonte="aumentar" title="${t('config.aumentarFonte')}">${ICON.setaCima} A</button>
              <button class="gear-opt gear-fonte" data-fonte="diminuir" title="${t('config.diminuirFonte')}">${ICON.setaBaixo} a</button>
            </div>
          </div>
        </section>
      </div>

      <div class="col">
        <section class="config-secao h-100">
          <h3>${t('config.cor')}</h3>
          <div class="config-linha">
            <span>${t('config.corDestaque')}</span>
            <div class="gear-grupo gear-cores" role="group" aria-label="${t('config.corDestaque')}">
              <button class="gear-cor ${acentoAtual === 'verde' ? 'active' : ''}" data-accent="verde" style="--sw:#2d6a4f" title="${t('cor.verde')}" aria-label="${t('cor.verde')}"></button>
              <button class="gear-cor ${acentoAtual === 'azul' ? 'active' : ''}" data-accent="azul" style="--sw:#1d4ed8" title="${t('cor.azul')}" aria-label="${t('cor.azul')}"></button>
              <button class="gear-cor ${acentoAtual === 'roxo' ? 'active' : ''}" data-accent="roxo" style="--sw:#6d28d9" title="${t('cor.roxo')}" aria-label="${t('cor.roxo')}"></button>
              <button class="gear-cor ${acentoAtual === 'laranja' ? 'active' : ''}" data-accent="laranja" style="--sw:#c2410c" title="${t('cor.laranja')}" aria-label="${t('cor.laranja')}"></button>
              <button class="gear-cor ${acentoAtual === 'rosa' ? 'active' : ''}" data-accent="rosa" style="--sw:#be185d" title="${t('cor.rosa')}" aria-label="${t('cor.rosa')}"></button>
            </div>
          </div>
        </section>
      </div>

      <div class="col">
        <section class="config-secao h-100">
          <h3>${t('config.idioma')}</h3>
          <div class="config-linha">
            <span>${t('config.idioma')}</span>
            <div class="gear-grupo" role="group" aria-label="${t('config.idioma')}">
              <button class="gear-opt ${idiomaAtual === 'pt' ? 'active' : ''}" data-idioma="pt" title="${t('idioma.pt')}"><span class="bandeira">${ICON.br}</span> PT</button>
              <button class="gear-opt ${idiomaAtual === 'en' ? 'active' : ''}" data-idioma="en" title="${t('idioma.en')}"><span class="bandeira">${ICON.us}</span> EN</button>
              <button class="gear-opt ${idiomaAtual === 'es' ? 'active' : ''}" data-idioma="es" title="${t('idioma.es')}"><span class="bandeira">${ICON.es}</span> ES</button>
            </div>
          </div>
        </section>
      </div>

      <div class="col">
        <section class="config-secao h-100">
          <h3>${t('config.dados')}</h3>
          <div class="card-botoes">
            <button class="card-btn" data-acao="fazerBackup" title="${t('title.fazerBackup')}">${ICON.reciclar} ${t('acao.fazerBackup')}</button>
            <button class="card-btn" data-acao="exportar" title="${t('title.exportar')}">${ICON.exportar} ${t('acao.exportar')}</button>
            <button class="card-btn" data-acao="importar" title="${t('title.importar')}">${ICON.importar} ${t('acao.importar')}</button>
            <button class="card-btn" data-acao="restaurar" title="${t('title.restaurar')}">${ICON.reciclar} ${t('acao.restaurar')}</button>
          </div>
        </section>
      </div>

      <div class="col">
        <section class="config-secao h-100">
          <h3>${t('cripto.titulo')}</h3>
          <p class="text-secondary small">${t('cripto.descricao')}</p>
          <div class="card-botoes">
            ${(estado.configuracoes.criptografia && estado.configuracoes.criptografia.ativa)
              ? `<button class="card-btn card-btn--perigo" data-acao="cripto-desativar" title="${t('title.criptoDesativar')}">${ICON.cadeado || '🔓'} ${t('cripto.desativar')}</button>`
              : `<button class="card-btn card-btn--destaque" data-acao="cripto-ativar" title="${t('title.criptoAtivar')}">${ICON.cadeado || '🔒'} ${t('cripto.ativar')}</button>`}
          </div>
        </section>
      </div>
    </div>
  `;
};

/* View "Configurações" como componente Vue (Vue é DONO da view). */
(function () {
  'use strict';
  if (typeof window.MeuBolsoViews === 'undefined') window.MeuBolsoViews = {};
  window.MeuBolsoViews.configuracoes = {
    name: 'ViewConfiguracoes',
    computed: {
      html() {
        if (window.uiTick) window.uiTick.value;
        const fn = window.__mbRender && window.__mbRender.configuracoes;
        return fn ? fn() : '';
      }
    },
    render() { return Vue.h('div', { class: 'view', innerHTML: this.html }); }
  };
})();
