// Render function movida de app.js (S3-4). Script clássico carregado apos
// app.js: consome globais (estado, t, fmt, ICON, NIVEIS, escapeHtml, calcularMetricas,
// gerarInsights, window.api, etc.) e registra window.__mbRender.sobre.
window.__mbRender = window.__mbRender || {};
window.__mbRender.sobre = function renderSobre() {
  const info = _sobreInfoCache || {};
  const REPO_URL = 'https://github.com/marceloacaci/meubolso';
  const DEV_URL = 'https://github.com/marceloacaci';
  const linha = (rotulo, valor) => `
    <div class="sobre-linha">
      <span class="sobre-rotulo">${rotulo}</span>
      <span class="sobre-valor">${escapeHtml(valor || '—')}</span>
    </div>`;

  const techs = [
    { ico: ICON.raio, nome: 'Electron', desc: t('sobre.versaoElectron') + (info.electron ? ' ' + info.electron : '') },
    { ico: ICON.nodejs, nome: 'Node.js', desc: t('sobre.versaoNode') + (info.node ? ' ' + info.node : '') },
    { ico: ICON.globo, nome: 'Chromium', desc: info.chrome ? 'v' + info.chrome : 'Browser engine' },
    { ico: ICON.javascript, nome: 'JavaScript (ES2022)', desc: 'Vanilla JS' },
    { ico: ICON.bootstrap, nome: 'Bootstrap 5.3', desc: t('sobre.bootstrap') },
    { ico: ICON.cadeado, nome: 'Context Isolation', desc: 'Electron preload + ipcRenderer' },
    { ico: ICON.engrenagem, nome: 'Vue 3', desc: t('techVue') },
    { ico: ICON.documento, nome: 'SQLite', desc: t('techSQLite') },
    { ico: ICON.grafico || ICON.relatorio, nome: 'Chart.js', desc: t('techChart') }
  ];

  return `
    <div class="page-header"><h2>${ICON.sobre} ${t('sobre.titulo')}</h2></div>

    <div class="config-grid sobre-grid">

      <section class="config-secao sobre-secao">
        <h3>${ICON.lampada} ${t('sobre.resumo')}</h3>
        <p class="sobre-descricao">${t('sobre.descricao')}</p>
        <div class="sobre-link-repo">
          <a href="${REPO_URL}" target="_blank" rel="noopener noreferrer" class="sobre-link">
            ${ICON.github} <span>${t('sobre.verProjeto')}</span>
          </a>
          <button type="button" class="card-btn" data-acao="verificar-atualizacao" id="btn-verificar-atualizacao" style="margin-left:8px">
            ${ICON.atualizar || ICON.engrenagem || '🔄'} <span>${t('sobre.verificarAtualizacao')}</span>
          </button>
        </div>
      </section>

      <section class="config-secao sobre-secao">
        <h3>${ICON.ferramenta} ${t('sobre.tech')}</h3>
        <ul class="list-group">
          ${techs.map(te => `
            <li class="list-group-item d-flex align-items-center gap-3"><span class="sobre-tech-ico">${te.ico}</span>
              <span class="sobre-tech-nome">${te.nome}</span>
              <span class="sobre-tech-desc ms-auto">${escapeHtml(te.desc)}</span></li>`).join('')}
        </ul>
      </section>

      <section class="config-secao sobre-secao" id="sobre-sistema">
        <h3>${ICON.monitor} ${t('sobre.sistema')}</h3>
        ${linha(t('sobre.versaoApp'), info.appVersion)}
        ${linha(t('sobre.ambiente'), t('sobre.ambiente.' + (info.ambiente || 'dev')))}
        ${linha(t('sobre.versaoElectron'), info.electron)}
        ${linha(t('sobre.versaoNode'), info.node)}
        ${linha('Chromium', info.chrome)}
        ${linha(t('sobre.sistemaOp'), info.so)}
        ${linha(t('sobre.arquitetura'), info.arquitetura)}
        ${linha(t('sobre.idiomas'), 'Português · English · Español')}
        ${linha(t('sobre.caminhoDados'), info.caminhoDados)}
      </section>

      <section class="config-secao sobre-secao">
        <h3>${ICON.pessoa} ${t('sobre.creditos')}</h3>
        <div class="sobre-creditos">
          <div class="sobre-dev-rotulo">${t('sobre.dev')}: ${t('sobre.devNome')}</div>
          <div class="sobre-dev-cargo">${t('sobre.devCargo')}</div>
          <a href="${DEV_URL}" target="_blank" rel="noopener noreferrer" class="sobre-link sobre-link-dev">
            ${ICON.github} <span>${t('sobre.verDevGitHub')}</span>
          </a>
        </div>
      </section>

      <section class="config-secao sobre-secao sobre-licenca">
        <h3>${ICON.documento} ${t('sobre.licenca')}</h3>
        <p class="sobre-copy">${t('sobre.copy')}</p>
      </section>

    </div>
  `;
}
;

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
    render() { return Vue.h('div', { class: 'view', innerHTML: this.html }); }
  };
})();
