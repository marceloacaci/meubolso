// @vitest-environment jsdom
// Teste de ponta a ponta (FCS) do dropdown customizado de frequência de
// notificação: valida que o clique num item -> marca ativo + dispara 'change'
// -> handler delegado salva no estado (intervaloMin) E sincroniza o outro
// dropdown (gear-panel). Carrega o app.js REAL (junto com dominio.js e a view
// de Configurações) num único contexto global, replicando o escopo compartilhado
// dos <script> clássicos do index.html.
import { test, expect } from 'vitest';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import vm from 'vm';

const requireReal = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

// ---- Stubs mínimos (globais, como no browser) ----
globalThis.Vue = {
  reactive: (o) => o,
  ref: (v) => ({ value: v }),
  computed: (f) => ({ value: f() }),
  createApp: () => ({ mount: () => {} }),
  h: () => ({}),
  nextTick: (fn) => {
    if (typeof fn === 'function') fn();
    return Promise.resolve();
  },
};
globalThis.window.api = {
  carregar: () =>
    Promise.resolve({
      dividas: [],
      pagamentos: [],
      carteiras: [],
      recorrentes: [],
      metas: [],
      perfis: [],
      configuracoes: { moeda: 'BRL' },
    }),
  perfilListar: () => Promise.resolve({ perfis: [], ativo: null }),
  notificarNativa: () => Promise.resolve({ ok: true }),
  larguraBase: () => Promise.resolve(1366),
  on: () => {},
};
globalThis.I18N = {
  pt: Object.fromEntries(
    [5, 30, 60, 180, 300, 600, 1440].map((m) => ['notif.int' + m, m + ' min'])
  ),
  en: {},
  es: {},
};
globalThis.ICON = new Proxy({}, { get: () => '' });

test('dropdown frequencia: clique persiste intervaloMin e sincroniza gear-panel', async () => {
  // Concatena os scripts na ORDEM do index.html e avalia num único contexto
  // global (escopo léxico de topo compartilhado entre os arquivos, como no browser).
  const files = [
    path.join(root, 'src', 'dominio.js'),
    path.join(root, 'app.js'),
    path.join(root, 'views', 'configuracoes.js'),
  ];
  const code = files.map((f) => '\n;//=== ' + f + ' ===\n' + fs.readFileSync(f, 'utf8')).join('\n');
  let bootErr = null;
  try {
    vm.runInThisContext(code, { filename: 'app-bundle.js' });
    // O app registra os listeners de click/change DENTRO de DOMContentLoaded
    // (handler async: faz await carregar() ANTES de montar a view e registrar
    // os listeners). No browser dispara após os scripts; aqui dispara manualmente
    // e aguardamos o microtask/timeout para o handler async concluir.
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await new Promise((r) => setTimeout(r, 50));
  } catch (e) {
    bootErr = e;
  }
  expect(bootErr, 'boot não deve lançar: ' + (bootErr && bootErr.stack)).toBeNull();
  expect(typeof window.__mbRender.configuracoes).toBe('function');

  // Monta a view de Configurações + o host do gear-panel no DOM (jsdom).
  document.body.innerHTML =
    '<div id="app"></div>' + '<div class="gear-panel"><div id="gear-notif-intervalo"></div></div>';
  const app = document.getElementById('app');
  app.innerHTML = window.__mbRender.configuracoes();
  const host = document.getElementById('gear-notif-intervalo');
  host.innerHTML = app.querySelector('.notif-dd').outerHTML;
  // jsdom NÃO tem motor de layout (getBoundingClientRect retorna 0), então
  // stubamos para simular larguras proporcionais ao texto e exercitar a lógica
  // de "largura fixa = maior rótulo (todas as línguas)".
  const _gBCR = window.Element.prototype.getBoundingClientRect;
  window.Element.prototype.getBoundingClientRect = function () {
    if (this.classList && this.classList.contains('notif-dd-trigger')) {
      const len = (this.querySelector('.notif-dd-valor')?.textContent || '').length;
      const w = 40 + len * 7;
      return { width: w, height: 30, top: 0, left: 0, right: w, bottom: 30 };
    }
    return _gBCR.call(this);
  };
  // S7b: fixa a largura do botão no maior texto (todas as línguas), como o
  // render() real faz via Vue.nextTick após a view de Configurações montar.
  if (typeof ajustarLargurasDropdownFrequencia === 'function') ajustarLargurasDropdownFrequencia();

  const estado = window.MeuBolso.estado;
  // Antes de interagir, o valor é o default 5 (ou ainda não salvo).
  const antes = (estado.configuracoes.notificacoes || {}).intervaloMin ?? null;
  expect([null, 5]).toContain(antes);

  // Clique REAL no item "30 minutos" da view de Configurações (exercita o
  // handler de click delegado -> marca ativo + dispara 'change' -> handler de
  // change delega salva no estado e sincroniza o outro dropdown).
  const item30 = app.querySelector('.notif-dd-item[data-min="30"]');
  item30.click();

  // Estado deve ter sido salvo pelo handler delegado de 'change'.
  const depois = (estado.configuracoes.notificacoes || {}).intervaloMin;
  expect(depois).toBe(30);

  // Item ativo na view deve ser o 30.
  const wrapActive = app.querySelector('.notif-dd-item.active');
  expect(wrapActive && wrapActive.dataset.min).toBe('30');

  // Sincronia bidirecional: o dropdown do gear-panel deve refletir 30.
  const hostActive = host.querySelector('.notif-dd-item.active');
  expect(hostActive && hostActive.dataset.min).toBe('30');
  const hostValor = host.querySelector('.notif-dd-valor');
  expect(hostValor && hostValor.textContent).toBe('30 min');

  // S7b: largura do botão FIXA no maior texto (não acompanha o selecionado).
  // O valor selecionado na view é 30, mas o trigger deve ter largura fixada
  // para o maior rótulo ("30 min" no stub pt). Medimos a largura natural de
  // "5 min" e de "30 min" e conferimos que o trigger bate com a maior.
  const cfgTrigger = app.querySelector('.notif-dd-trigger');
  const cfgValor = cfgTrigger.querySelector('.notif-dd-valor');
  const natural5 = (() => {
    cfgValor.textContent = '5 min';
    const w = cfgTrigger.getBoundingClientRect().width;
    return w;
  })();
  const natural30 = (() => {
    cfgValor.textContent = '30 min';
    const w = cfgTrigger.getBoundingClientRect().width;
    return w;
  })();
  cfgValor.textContent = '30 min';
  const fixa = parseFloat(cfgTrigger.style.width);
  expect(fixa).toBeGreaterThan(0);
  // A largura fixa deve ser a do maior texto, não a do menor (5 min).
  expect(fixa).toBeGreaterThanOrEqual(Math.ceil(natural30) - 1);
  expect(Math.ceil(natural5)).toBeLessThan(Math.ceil(natural30));
});
