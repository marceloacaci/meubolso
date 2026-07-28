// Harness de verificação: carrega index.html + scripts (Vue, vendor, app,
// views/*) em jsdom com stubs mínimos, monta o app Vue (root <component :is>)
// e confere a renderização de todas as views + tema + engrenagem + acento.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

const dom = new JSDOM(html, {
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  url: 'file://' + __dirname + '/index.html'
});
const { window } = dom;

window.api = {
  carregar: () => Promise.resolve({
    dividas: [
      { id: 'd1', descricao: 'Cartão X', credor: 'Banco', categoria: 'cartao', observacao: '',
        parcelas: [
          { id: 'p1', numero: 1, valor: 100, vencimento: '2030-01-01', status: 'pendente' },
          { id: 'p2', numero: 2, valor: 100, vencimento: '2020-01-01', status: 'atrasado' }
        ] }
    ],
    pagamentos: [
      { id: 'pg1', dividaId: 'd1', parcelaId: 'p1', valor: 100, data: '2029-06-01', nota: 'teste' }
    ],
    carteiras: [ { id: 'c1', nome: 'Nubank', saldo: 500 } ],
    gamificacao: { xp: 12, nivel: 2, ultimoAcesso: '2020-01-01', historico: [] },
    configuracoes: { moeda: 'BRL', tema: 'light', idioma: 'pt' }
  }),
  sistemaInfo: () => Promise.resolve({ appVersion: '9.9.9', electron: '30', node: '20', chrome: '120', so: 'Win', arquitetura: 'x64' }),
  flashFoco: () => {},
  salvar: () => Promise.resolve(),
  restaurar: () => Promise.resolve(),
  backupInfo: () => Promise.resolve(null),
  exportar: () => Promise.resolve(),
  importar: () => Promise.resolve()
};
window.localStorage = { _d: {}, getItem(k){return this._d[k]||null;}, setItem(k,v){this._d[k]=String(v);} };
window.requestAnimationFrame = (cb) => setTimeout(cb, 0);

// Carrega os scripts na ordem do index.html.
const SCRIPTS = [
  'vendor/vue.global.prod.js',
  'vendor/bootstrap.bundle.min.js',
  'icons.js',
  'app.js',
  'views/painel.js', 'views/relatorio.js', 'views/vencimentos.js', 'views/dividas.js',
  'views/pagamentos.js', 'views/carteiras.js', 'views/gamificacao.js', 'views/sobre.js',
  'views/configuracoes.js',
  'relogio.js'
];
for (const f of SCRIPTS) {
  const code = fs.readFileSync(path.join(__dirname, f), 'utf8');
  window.eval(code);
}

console.log('vue global:', typeof window.Vue !== 'undefined');
console.log('views registradas:', Object.keys(window.MeuBolsoViews || {}).join(','));
console.log('uiTick:', typeof window.uiTick !== 'undefined');
console.log('__mbRender:', typeof window.__mbRender !== 'undefined');

const errors = [];
window.addEventListener('error', (e) => errors.push(e.error || e.message));

// Dispara o DOMContentLoaded (app.js monta o root Vue + carrega dados).
// O app.js tem guard contra re-entrada, então disparar aqui é seguro mesmo
// se o jsdom também disparar o evento naturalmente.
window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));

// Aguarda o flush assíncrono do DOM pelo Vue (microtask/nextTick).
const flush = () => (window.Vue && window.Vue.nextTick)
  ? window.Vue.nextTick()
  : new Promise(r => setTimeout(r, 0));

setTimeout(async () => {
  const doc = window.document;
  // Valida a troca de view conferindo um marcador de conteúdo esperado por view.
  const marcadores = {
    painel: 'Painel', dividas: 'Minhas dívidas', pagamentos: 'Pagamentos', vencimentos: 'Vencimentos',
    relatorio: 'Relatório', carteiras: 'Carteiras', configuracoes: 'Configurações',
    sobre: 'Sobre', gamificacao: 'Pontuação'
  };
  const temNav = new Set(['painel','dividas','pagamentos','vencimentos','relatorio','carteiras','configuracoes','sobre']);
  const viewsComBotao = new Set(['dividas','pagamentos','vencimentos','carteiras','configuracoes']);
  let ok = true;
  const views = Object.keys(marcadores);
  for (const v of views) {
    let alvo;
    if (temNav.has(v)) {
      alvo = doc.querySelector(`.nav-link[data-view="${v}"]`);
      if (!alvo) { console.log(`! nav ${v} ausente`); ok = false; continue; }
    } else {
      // gamificacao: acessada via botão "Ver detalhes" do badge de nível.
      alvo = doc.querySelector('[data-view="gamificacao"]');
      if (!alvo) { console.log(`! botão ${v} ausente`); ok = false; continue; }
    }
    alvo.click();
    window.uiTick.value++;
    await flush(); // espera o Vue renderizar a nova view
    const appHtml = doc.getElementById('app').innerHTML;
    const tem = marcadores[v];
    const achou = appHtml.indexOf(tem) >= 0;
    const hasCard = /class="[^"]*card/.test(appHtml);
    const hasBtn = /class="[^"]*btn/.test(appHtml);
    console.log(`view ${v.padEnd(14)} | achou "${tem}":${achou?1:0} card:${hasCard?1:0} btn:${hasBtn?1:0} | len:${appHtml.length}`);
    if (!achou) { console.log(`  !! view ${v} não trocou (conteúdo esperado ausente)`); ok = false; }
    if (viewsComBotao.has(v) && !hasBtn) ok = false;
  }

  // Tema dark via engrenagem.
  doc.querySelector('.nav-link[data-view="configuracoes"]').click();
  window.uiTick.value++;
  await flush();
  const darkBtn = doc.querySelector('[data-tema="dark"]');
  if (!darkBtn) { console.log('! botão tema dark ausente'); ok = false; }
  else {
    darkBtn.click();
    await flush();
    const bsTheme = doc.documentElement.getAttribute('data-bs-theme');
    console.log('data-bs-theme após dark:', bsTheme, bsTheme === 'dark' ? 'OK' : 'FALHOU');
    if (bsTheme !== 'dark') ok = false;
  }

  // Modal com form-control (Bootstrap) — abre nova dívida.
  doc.querySelector('.nav-link[data-view="dividas"]').click();
  window.uiTick.value++;
  await flush();
  try { doc.querySelector('[data-acao="nova-divida"]').click(); } catch(e){}
  await flush();
  const modal = doc.getElementById('modal');
  const modalHasFormControl = /form-control/.test(modal.innerHTML);
  console.log('modal com form-control (Bootstrap):', modalHasFormControl ? 'OK' : 'FALHOU');
  if (!modalHasFormControl) ok = false;

  // Engrenagem abre/fecha + acento.
  const gearBtn2 = doc.getElementById('btn-gear');
  if (!gearBtn2) { console.log('! botão engrenagem ausente'); ok = false; }
  else {
    gearBtn2.click();
    await flush();
    const panel = doc.getElementById('gear-panel');
    const aberto = panel && !panel.classList.contains('hidden');
    console.log('painel da engrenagem abre:', aberto ? 'OK' : 'FALHOU');
    if (!aberto) ok = false;
    const corAzul = doc.querySelector('[data-accent="azul"]');
    if (!corAzul) { console.log('! swatch azul ausente'); ok = false; }
    else {
      corAzul.click();
      await flush();
      const prim = doc.documentElement.style.getPropertyValue('--primary').trim();
      console.log('acento azul aplicou --primary:', prim, prim === '#1d4ed8' ? 'OK' : 'FALHOU');
      if (prim !== '#1d4ed8') ok = false;
    }
    doc.body.click();
    await flush();
    const fechou = panel.classList.contains('hidden');
    console.log('painel fecha ao clicar fora:', fechou ? 'OK' : 'FALHOU');
    if (!fechou) ok = false;
  }

  // Reatividade de dados (o coração da migração): mutar estado.dividas e
  // chamar render() deve refletir na view SEM o app.js reescrever o #app.
  doc.querySelector('.nav-link[data-view="dividas"]').click();
  window.uiTick.value++;
  await flush();
  const contarLinhas = () => {
    const html = doc.getElementById('app').innerHTML;
    // Cada dívida renderiza uma linha com data-acao="editar-divida".
    return (html.match(/data-acao="editar-divida"/g) || []).length;
  };
  const antes = contarLinhas();
  // Adiciona uma dívida diretamente no estado reativo (Vue.reactive) e renderiza.
  if (window.MeuBolso && window.MeuBolso.estado) {
    window.MeuBolso.estado.dividas.push({
      id: 'd-test', descricao: 'Dívida de teste reativo', credor: 'Teste',
      categoria: 'outro', observacao: '',
      parcelas: [{ id: 'pt1', numero: 1, valor: 50, vencimento: '2030-05-05', status: 'pendente' }]
    });
  }
  // render() não é acessível aqui (escopo do eval); mas ele só faz
  // uiTick.value++, que é o que dispara o recomputo das views.
  window.uiTick.value++;
  await flush();
  const depois = contarLinhas();
  console.log(`reatividade de dados: dividas antes=${antes} depois=${depois}`, depois > antes ? 'OK' : 'FALHOU');
  if (!(depois > antes)) ok = false;

  console.log('\nErros de runtime capturados:', errors.length);
  errors.forEach(e => console.log('  -', e && e.message ? e.message : e));
  console.log('\nRESULTADO:', ok && errors.length === 0 ? 'PASSOU' : 'FALHOU');
  process.exit(ok && errors.length === 0 ? 0 : 1);
}, 600);
