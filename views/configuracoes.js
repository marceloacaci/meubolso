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
            <div class="btn-group" role="group" aria-label="${t('config.tema')}">
              <button class="btn btn-outline-secondary ${temaAtual === 'light' ? 'active' : ''}" data-tema="light">${ICON.sol} ${t('tema.claro')}</button>
              <button class="btn btn-outline-secondary ${temaAtual === 'dark' ? 'active' : ''}" data-tema="dark">${ICON.lua} ${t('tema.escuro')}</button>
            </div>
          </div>
          <div class="config-linha">
            <span>${t('config.fonte')} (${tamFonte})</span>
            <div class="btn-group" role="group" aria-label="${t('config.fonte')}">
              <button class="btn btn-outline-secondary" data-fonte="aumentar" title="Aumentar fonte">${ICON.setaCima} A</button>
              <button class="btn btn-outline-secondary" data-fonte="diminuir" title="Diminuir fonte">${ICON.setaBaixo} a</button>
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
              <button class="gear-cor ${acentoAtual === 'verde' ? 'active' : ''}" data-accent="verde" style="--sw:#2d6a4f" title="Verde" aria-label="Verde"></button>
              <button class="gear-cor ${acentoAtual === 'azul' ? 'active' : ''}" data-accent="azul" style="--sw:#1d4ed8" title="Azul" aria-label="Azul"></button>
              <button class="gear-cor ${acentoAtual === 'roxo' ? 'active' : ''}" data-accent="roxo" style="--sw:#6d28d9" title="Roxo" aria-label="Roxo"></button>
              <button class="gear-cor ${acentoAtual === 'laranja' ? 'active' : ''}" data-accent="laranja" style="--sw:#c2410c" title="Laranja" aria-label="Laranja"></button>
              <button class="gear-cor ${acentoAtual === 'rosa' ? 'active' : ''}" data-accent="rosa" style="--sw:#be185d" title="Rosa" aria-label="Rosa"></button>
            </div>
          </div>
        </section>
      </div>

      <div class="col">
        <section class="config-secao h-100">
          <h3>${t('config.idioma')}</h3>
          <div class="config-linha">
            <span>${t('config.idioma')}</span>
            <div class="btn-group" role="group" aria-label="${t('config.idioma')}">
              <button class="btn btn-outline-secondary ${idiomaAtual === 'pt' ? 'active' : ''}" data-idioma="pt" title="Português"><span class="bandeira">${ICON.br}</span> PT</button>
              <button class="btn btn-outline-secondary ${idiomaAtual === 'en' ? 'active' : ''}" data-idioma="en" title="English"><span class="bandeira">${ICON.us}</span> EN</button>
              <button class="btn btn-outline-secondary ${idiomaAtual === 'es' ? 'active' : ''}" data-idioma="es" title="Español"><span class="bandeira">${ICON.es}</span> ES</button>
            </div>
          </div>
        </section>
      </div>

      <div class="col">
        <section class="config-secao h-100">
          <h3>${t('config.dados')}</h3>
          <div class="card-botoes">
            <button class="card-btn" data-acao="fazerBackup" title="Fazer um backup local agora (copia meubolso.json para dados.bak.json)">${ICON.reciclar} ${t('acao.fazerBackup')}</button>
            <button class="card-btn" data-acao="exportar" title="Exportar dados para um arquivo JSON">${ICON.exportar} ${t('acao.exportar')}</button>
            <button class="card-btn" data-acao="importar" title="Importar dados de um arquivo JSON">${ICON.importar} ${t('acao.importar')}</button>
            <button class="card-btn" data-acao="restaurar" title="Restaurar a partir do backup automático local">${ICON.reciclar} ${t('acao.restaurar')}</button>
          </div>
        </section>
      </div>

      <div class="col">
        <section class="config-secao h-100">
          <h3>${t('cripto.titulo')}</h3>
          <p class="text-secondary small">${t('cripto.descricao')}</p>
          <div class="card-botoes">
            ${(estado.configuracoes.criptografia && estado.configuracoes.criptografia.ativa)
              ? `<button class="card-btn card-btn--perigo" data-acao="cripto-desativar">${ICON.cadeado || '🔓'} ${t('cripto.desativar')}</button>`
              : `<button class="card-btn card-btn--destaque" data-acao="cripto-ativar">${ICON.cadeado || '🔒'} ${t('cripto.ativar')}</button>`}
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
