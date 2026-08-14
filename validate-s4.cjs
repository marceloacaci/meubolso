// Validação funcional da Sprint 4 — sobe o Electron, navega nas 4 novas views,
// dirige o fluxo real dos modais (CRUD) e captura erros de console.
// IMPORTANTE: sobrescreve `persistir` para no-op para NÃO tocar no DB real.
// Carrega o main.js REAL do app (handlers IPC + criação de janela) e depois
// inspeciona a janela via BrowserWindow.getAllWindows().
const { app, BrowserWindow } = require('electron');
const path = require('path');

const erros = [];
function log(...a) { console.log(...a); }

async function waitFor(win, expr, timeout = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const ok = await win.webContents.executeJavaScript(`(function(){try{return ${expr}}catch(e){return false}})()`);
      if (ok) return true;
    } catch (_) {}
    await new Promise(r => setTimeout(r, 100));
  }
  return false;
}

// Sobe o app real (registra handlers IPC e cria a janela).
require('./main.js');

app.whenReady().then(async () => {
  // Aguarda a janela do main.js ser criada.
  let win = null;
  for (let i = 0; i < 50 && !win; i++) {
    const wins = BrowserWindow.getAllWindows();
    if (wins.length) win = wins[wins.length - 1];
    else await new Promise(r => setTimeout(r, 100));
  }
  if (!win) { log('FALHA: janela não criada'); finish(false); return; }
  win.webContents.on('console-message', (ev) => {
    if (ev.type === 'error' || ev.level === 3) erros.push('[console] ' + ev.message);
  });

  const ready = await waitFor(win, "typeof estado !== 'undefined' && document.querySelector('#app') && document.querySelector('#app').children.length > 0");
  if (!ready) { log('FALHA: app não inicializou'); finish(false); return; }
  log('OK app inicializou');

  // Protege o DB real: persistir vira no-op.
  await win.webContents.executeJavaScript(`(function(){
    if (typeof persistir === 'function') { window.__persistir = persistir; persistir = function(){}; }
  })()`);
  log('OK persistir() desativado (DB real protegido)');

  const resultados = [];

  // ---------- S4-1: Recorrentes (fluxo de modal completo) ----------
  try {
    const diag = await win.webContents.executeJavaScript(`(async function(){
      const out = {};
      const tick = () => new Promise(r => setTimeout(r, 300));
      window.__rej = '';
      window.addEventListener('unhandledrejection', e => { window.__rej += (e.reason && e.reason.message ? e.reason.message : String(e.reason)) + ' | '; });
      try { setView('recorrentes'); } catch(e){ out.setView = e.message; }
      await tick();
      out.antes = (estado.recorrentes||[]).length;
      out.temBtn = !!document.querySelector('[data-acao="nova-recorrente"]');
      try { document.querySelector('[data-acao="nova-recorrente"]').click(); } catch(e){ out.click = e.message; }
      await tick();
      out.modalOk = !!document.querySelector('#form-modal');
      const f = document.querySelector('#form-modal');
      if (f) {
        const campos = {};
        f.querySelectorAll('input,select,textarea').forEach(el => campos[el.name||el.id] = (el.type==='checkbox'?'chk':'inp'));
        out.campos = JSON.stringify(campos);
        try {
          f.querySelector('[name=descricao]').value = 'Netflix';
          const cat = f.querySelector('[name=categoria]'); if (cat) cat.value = 'servico';
          f.querySelector('[name=valor]').value = '39.90';
          f.querySelector('[name=diaVencimento]').value = '15';
          const p = f.querySelector('[name=pausada]'); if (p) p.checked = false;
          try { f.requestSubmit(); } catch(e){ out.submitErr = e.message; }
        } catch(e){ out.preench = e.message; }
      }
      await tick();
      out.modalFechou = !document.querySelector('#form-modal');
      out.rej = window.__rej;
      out.depois = (estado.recorrentes||[]).length;
      out.appTxt = (document.querySelector('#app').textContent||'').slice(0, 80);
      out.temNetflix = /Netflix/.test(document.querySelector('#app').textContent||'');
      return out;
    })()`);
    log('S4-1 diag:', JSON.stringify(diag));
    const ok = diag.modalOk && diag.depois === diag.antes + 1 && diag.temNetflix;
    resultados.push(['S4-1 Recorrentes (CRUD via modal)', ok]);
    log(ok ? 'OK S4-1: recorrente criado e renderizado' : 'FALHA S4-1');
  } catch (e) { resultados.push(['S4-1 Recorrentes', false]); log('FALHA S4-1:', e.message); }

  // ---------- S4-2: Juros & CET (define taxa na dívida e renderiza) ----------
  try {
    await win.webContents.executeJavaScript(`(function(){
      if (estado.dividas && estado.dividas[0]) estado.dividas[0].taxaMensal = 3;
    })()`);
    await win.webContents.executeJavaScript("setView('juros')");
    await new Promise(r => setTimeout(r, 300));
    const apptxt = await win.webContents.executeJavaScript("document.querySelector('#app').textContent");
    const ok = apptxt.length > 50 && /CET|Juros|Total a pagar/i.test(apptxt);
    resultados.push(['S4-2 Juros & CET', ok]);
    log(ok ? 'OK S4-2: view Juros renderizou com CET/juros' : 'FALHA S4-2: view Juros vazia');
  } catch (e) { resultados.push(['S4-2 Juros', false]); log('FALHA S4-2:', e.message); }

  // ---------- S4-3 + S4-5: Metas (CRUD) e conquista de XP ao concluir ----------
  try {
    const xpAntes = await win.webContents.executeJavaScript('(estado.gamificacao && estado.gamificacao.xp) || 0');
    await win.webContents.executeJavaScript("setView('metas')");
    await new Promise(r => setTimeout(r, 300));
    const temBtn = await win.webContents.executeJavaScript("!!document.querySelector('[data-acao=\"nova-meta\"]')");
    if (!temBtn) throw new Error('botão nova-meta ausente');
    await win.webContents.executeJavaScript("document.querySelector('[data-acao=\"nova-meta\"]').click()");
    await new Promise(r => setTimeout(r, 300));
    const modalOk = await win.webContents.executeJavaScript("!!document.querySelector('#form-modal')");
    if (!modalOk) throw new Error('modal de meta não abriu');
    await win.webContents.executeJavaScript(`(function(){
      const f = document.querySelector('#form-modal');
      f.querySelector('[name=titulo]').value = 'Viagem';
      f.querySelector('[name=valorAlvo]').value = '1000';
      f.querySelector('[name=valorAtual]').value = '0';
      const p = f.querySelector('[name=prazo]'); if (p) p.value = '2026-12-31';
      f.requestSubmit();
    })()`);
    await new Promise(r => setTimeout(r, 200));
    const nMetas = await win.webContents.executeJavaScript('estado.metas.length');
    const apptxt = await win.webContents.executeJavaScript("document.querySelector('#app').textContent");
    const renderOk = nMetas > 0 && /Viagem/.test(apptxt) && /%/.test(apptxt);
    // Concluir a meta (S4-5) e checar XP
    await win.webContents.executeJavaScript(`(function(){
      const m = estado.metas[estado.metas.length-1];
      m.valorAtual = m.valorAlvo; // completa
      if (typeof verificarConquistaMeta === 'function') verificarConquistaMeta(m);
    })()`);
    await win.webContents.executeJavaScript("setView('metas')");
    await new Promise(r => setTimeout(r, 150));
    const xpDepois = await win.webContents.executeJavaScript('(estado.gamificacao && estado.gamificacao.xp) || 0');
    const ok = renderOk && xpDepois > xpAntes;
    resultados.push(['S4-3 Metas + S4-5 XP', ok]);
    log(ok ? `OK S4-3/5: meta criada e XP subiu ${xpAntes} -> ${xpDepois}` : `FALHA S4-3/5: render=${renderOk} xp ${xpAntes}->${xpDepois}`);
  } catch (e) { resultados.push(['S4-3/S4-5 Metas', false]); log('FALHA S4-3/5:', e.message); }

  // ---------- S4-4: Simulador (calcula via função pura e renderiza via botão) ----------
  try {
    const fnExiste = await win.webContents.executeJavaScript("typeof simularQuitacao === 'function'");
    if (!fnExiste) throw new Error('simularQuitacao ausente no renderer');
    // Habilita dívidas com saldo > 0 (estado de demonstração já tem 8 dívidas).
    await win.webContents.executeJavaScript("setView('simulador')");
    await new Promise(r => setTimeout(r, 300));
    const temBtn = await win.webContents.executeJavaScript("!!document.querySelector('[data-acao=\"simular-quitacao\"]')");
    if (!temBtn) throw new Error('botão simular-quitacao ausente');
    // Preenche pagamento mensal e dispara o cálculo.
    await win.webContents.executeJavaScript(`(function(){
      const f = document.querySelector('#app form');
      if (f) { const p = f.querySelector('[name=pagamentoMensal]'); if (p) p.value = '1500'; }
      const b = document.querySelector('[data-acao=\"simular-quitacao\"]'); if (b) b.click();
    })()`);
    await new Promise(r => setTimeout(r, 250));
    const apptxt = await win.webContents.executeJavaScript("document.querySelector('#app').textContent");
    const ok = apptxt.length > 30 && /(meses|Meses|Avalanche|econom|Econom)/i.test(apptxt);
    resultados.push(['S4-4 Simulador', ok]);
    log(ok ? 'OK S4-4: simulador renderizou resultado' : 'FALHA S4-4: simulador vazio');
  } catch (e) { resultados.push(['S4-4 Simulador', false]); log('FALHA S4-4:', e.message); }

  // ---------- Resumo ----------
  log('\n===== RESUMO SPRINT 4 (validação em runtime) =====');
  let pass = true;
  resultados.forEach(([nome, ok]) => { log(`${ok ? 'PASS' : 'FAIL'}  ${nome}`); if (!ok) pass = false; });
  log(`Erros de console capturados: ${erros.length}`);
  erros.slice(0, 10).forEach(e => log('  ' + e));
  finish(pass && erros.length === 0);
});

function finish(ok) {
  log(ok ? '\n✅ VALIDAÇÃO SPRINT 4: PASSOU' : '\n❌ VALIDAÇÃO SPRINT 4: FALHOU');
  try { require('electron').app.quit(); } catch (_) {}
  setTimeout(() => process.exit(ok ? 0 : 1), 300);
}
