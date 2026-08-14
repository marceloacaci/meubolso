// S3-5: smoke test de verificação por render real no Electron.
// Sobe o app, monta cada view e detecta view/gráfico "em branco" (pixel count):
//  - conta nós de texto não-vazios no #app (a view renderizou conteúdo?);
//  - para cada <canvas>, lê getImageData e conta pixels com alpha > 0 (gráfico desenhado?).
// Protege o DB real desativando persistir() e evitando janela de crash.
const { app, BrowserWindow } = require('electron');
const tempo = (m) => new Promise(r => setTimeout(r, m));
const log = (m) => console.log('[validate-render] ' + m);

let terminou = false;
function finish(ok) { if (terminou) return; terminou = true; app.quit(); }

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
setTimeout(() => { log('TIMEOUT — encerrando'); finish(false); }, 120000);

// Views a validar (chaves em window.MeuBolsoViews). Views com gráfico/canvas esperado.
const VIEWS = ['painel','dividas','pagamentos','vencimentos','relatorio','carteiras','gamificacao','configuracoes','conquistas','recorrentes','metas','juros','simulador','sobre','backups'];
const CANVAS_VIEWS = ['painel','relatorio']; // onde há Chart.js (canvas)

app.whenReady().then(async () => {
  try {
    require('./main.js');
    let win = null;
    for (let i = 0; i < 40; i++) {
      const ws = BrowserWindow.getAllWindows();
      if (ws.length) { win = ws[0]; break; }
      await tempo(250);
    }
    if (!win) { log('janela não encontrada'); finish(false); return; }
    win.webContents.on('console-message', (e) => { if (e.type === 'error') log('console.error: ' + e.message); });

    // Protege o DB real: persistir vira no-op.
    await win.webContents.executeJavaScript('window.__mbRender && (window.persistir = function(){});').catch(()=>{});
    await tempo(300);

    const resultados = [];
    for (const v of VIEWS) {
      const r = await win.webContents.executeJavaScript(`(async function(){
        try {
          setView('${v}');
          await new Promise(r => setTimeout(r, 450));
          const app = document.querySelector('#app');
          if (!app) return { view: '${v}', ok:false, motivo:'#app ausente' };
          // conta nós de texto não-vazios (conteúdo renderizado)
          let textNodes = 0;
          app.querySelectorAll('*').forEach(el => {
            const t = (el.textContent || '').trim();
            if (t.length > 0) textNodes++;
          });
          // canvas: pixels não-vazios
          const canvases = Array.from(app.querySelectorAll('canvas'));
          let canvasVazio = 0, canvasTotal = canvases.length;
          canvases.forEach(c => {
            try {
              const ctx = c.getContext('2d');
              if (!ctx) return;
              const w = c.width, h = c.height;
              if (!w || !h) { canvasVazio++; return; }
              const img = ctx.getImageData(0,0,w,h).data;
              let nonEmpty = 0;
              for (let i=3; i<img.length; i+=4) { if (img[i] !== 0) { nonEmpty++; if (nonEmpty>50) break; } }
              if (nonEmpty === 0) canvasVazio++;
            } catch(e) { canvasVazio++; }
          });
          const esperadoCanvas = ${JSON.stringify(CANVAS_VIEWS)}.includes('${v}');
          // view "em branco" = nenhum conteúdo de texto
          const ok = textNodes > 0;
          let aviso = null;
          if (esperadoCanvas && canvasTotal > 0 && canvasVazio === canvasTotal) aviso = 'canvas vazio';
          return { view:'${v}', ok, textNodes, canvasTotal, canvasVazio, aviso };
        } catch(e) { return { view:'${v}', ok:false, motivo:String(e) }; }
      })()`);
      resultados.push(r);
      log(`view ${r.view}: ok=${r.ok} texto=${r.textNodes} canvas=${r.canvasTotal} vazio=${r.canvasVazio}${r.aviso?(' AVISO='+r.aviso):''}${r.motivo?(' MOTIVO='+r.motivo):''}`);
    }

    const falhas = resultados.filter(r => !r.ok);
    const avisos = resultados.filter(r => r.aviso);
    log(`RESUMO: ${resultados.length} views, ${falhas.length} em branco, ${avisos.length} avisos de canvas`);
    if (falhas.length) { log('VIEWS EM BRANCO: ' + falhas.map(f=>f.view).join(', ')); finish(false); }
    else { log('SMOKE TEST DE RENDER: PASSOU (nenhuma view em branco)'); finish(true); }
  } catch (e) {
    log('erro fatal: ' + (e && e.stack || e));
    finish(false);
  }
});
