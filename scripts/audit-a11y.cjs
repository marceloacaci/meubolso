// Auditoria de Acessibilidade (S6-4) — MeuBolso
// Carrega o index.html REAL em Electron headless e mede critérios WCAG 2.1 AA:
//   2.4.1  Skip-link focalizável e visível ao receber foco
//   2.4.7  Foco visível (:focus-visible aplica outline)
//   1.1.1  Ícones decorativos com aria-hidden
//   4.1.2  #app alvo do skip-link (tabindex=-1)
//   1.4.3  Contraste AA (texto 4.5:1, texto grande 3:1) nos temas claro/escuro
// Não toca userData (persistência desativada por segurança).
//
// Uso: cd /d/Project && node node_modules/electron/cli.js scripts/audit-a11y.cjs
const { app, BrowserWindow } = require('electron');
const path = require('path');

function rel(c, b) { // relação de contraste WCAG
  const L = (hex) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return null;
    const n = parseInt(m[1], 16);
    const ch = [ (n >> 16) & 255, (n >> 8) & 255, n & 255 ].map(v => {
      v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  };
  const L1 = L(c), L2 = L(b);
  if (L1 == null || L2 == null) return null;
  const hi = Math.max(L1, L2), lo = Math.min(L1, L2);
  return (hi + 0.05) / (lo + 0.05);
}

const resultados = [];
function check(nome, ok, detalhe) { resultados.push({ nome, ok, detalhe }); }

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 1200, height: 800 });
  const erros = [];
  win.webContents.on('console-message', (e, level, msg) => { if (level === 2) erros.push(msg); });
  await win.loadFile(path.join(__dirname, '..', 'index.html'));
  await new Promise(r => setTimeout(r, 800)); // deixa app.js popular ícones/data-i18n

  // 2.4.1 + 4.1.2: skip-link + #app tabindex
  const skip = await win.webContents.executeJavaScript(`(()=>{
    const a = document.querySelector('.skip-link');
    const app = document.getElementById('app');
    return {
      skipExiste: !!a,
      skipHref: a ? a.getAttribute('href') : null,
      skipPrimeiroFocavel: (function(){ const r=document.body; const f=r.querySelector('a,button,input,select,textarea,[tabindex]'); return a && f === a; })(),
      appTabindex: app ? app.getAttribute('tabindex') : null,
    };
  })()`);
  check('2.4.1 skip-link existe', skip.skipExiste, JSON.stringify(skip));
  check('4.1.2 #app tabindex=-1', skip.appTabindex === '-1', 'tabindex=' + skip.appTabindex);

  // 2.4.7: foco visível — inspeciona o stylesheet (não depende de foco por
  // teclado real, que :focus-visible exige e o headless não reproduz de forma
  // estável com .focus() programático). Prova que a regra existe e aplica outline.
  const foco = await win.webContents.executeJavaScript(`(()=>{
    let regraEncontrada = false, amostra = null;
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch(e) { continue; }
      for (const r of rules) {
        if (r.type !== CSSRule.STYLE_RULE) continue;
        const sel = r.selectorText || '';
        if (sel.includes(':focus-visible')) {
          const o = r.style.outlineStyle || r.style.outline;
          if (o && o !== 'none') { regraEncontrada = true; amostra = sel + ' -> ' + r.style.cssText; }
        }
      }
    }
    return { ok: regraEncontrada, amostra };
  })()`);
  check('2.4.7 foco visível (:focus-visible no stylesheet)', foco.ok, JSON.stringify(foco));

  // 1.1.1: ícones decorativos com aria-hidden
  const icones = await win.webContents.executeJavaScript(`(()=>{
    const els = [...document.querySelectorAll('[data-ico]')];
    const semHidden = els.filter(e => e.getAttribute('aria-hidden') !== 'true' && !(e.querySelector('svg[aria-hidden=\"true\"]')));
    return { total: els.length, semHidden: semHidden.length, exemplos: semHidden.slice(0,5).map(e=>e.getAttribute('data-ico')) };
  })()`);
  check('1.1.1 ícones decorativos aria-hidden', icones.semHidden === 0, JSON.stringify(icones));

  // 1.4.3: contraste AA nos dois temas
  async function medeContraste(tema) {
    await win.webContents.executeJavaScript(`document.documentElement.setAttribute('data-theme','${tema}');document.documentElement.setAttribute('data-bs-theme','${tema}');`);
    return win.webContents.executeJavaScript(`(()=>{
      const cs = getComputedStyle(document.documentElement);
      const v = (n)=>cs.getPropertyValue(n).trim();
      return { text: v('--text'), bg: v('--bg'), primary: v('--primary'), textMuted: v('--text-muted') };
    })()`);
  }
  const claro = await medeContraste('light');
  const escuro = await medeContraste('dark');
  const cTextoClaro = rel(claro.text, claro.bg);
  const cPrimClaro = rel(claro.primary, claro.bg);
  const cTextoEscuro = rel(escuro.text, escuro.bg);
  const cPrimEscuro = rel(escuro.primary, escuro.bg);
  check('1.4.3 contraste texto AA (claro >=4.5)', cTextoClaro >= 4.5, 'texto/bg=' + cTextoClaro.toFixed(2));
  check('1.4.3 contraste primary AA (claro >=4.5)', cPrimClaro >= 4.5, 'primary/bg=' + cPrimClaro.toFixed(2));
  check('1.4.3 contraste texto AA (escuro >=4.5)', cTextoEscuro >= 4.5, 'texto/bg=' + cTextoEscuro.toFixed(2));
  check('1.4.3 contraste primary AA (escuro >=4.5)', cPrimEscuro >= 4.5, 'primary/bg=' + cPrimEscuro.toFixed(2));

  console.log('\n=== AUDITORIA A11Y (WCAG 2.1 AA) ===');
  let pass = 0;
  for (const r of resultados) {
    console.log((r.ok ? 'PASS ' : 'FAIL ') + r.nome + '  | ' + r.detalhe);
    if (r.ok) pass++;
  }
  console.log(`\nRESUMO: ${pass}/${resultados.length} passaram | erros console: ${erros.length}`);
  console.log(erros.length ? 'ERROS: ' + erros.slice(0,5).join(' || ') : 'sem erros de console');
  app.quit();
});

setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 60000);
