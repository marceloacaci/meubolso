// S6-2: teste de varredura XSS em runtime. Injeta payloads maliciosos em
// campos do usuario (descricao/credor/observacao de uma divida e em um modal)
// e verifica que eles sao renderizados COMO TEXTO (escapados), nunca como
// elementos vivos (img onerror / script). Tambem monitora se alert() disparou.
const { app, BrowserWindow } = require('electron');
const tempo = (m) => new Promise(r => setTimeout(r, m));
const log = (m) => console.log('[validate-xss] ' + m);
let terminou = false;
function finish(ok) { if (terminou) return; terminou = true; app.quit(); }
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
setTimeout(() => { log('TIMEOUT'); finish(false); }, 90000);

app.whenReady().then(async () => {
  try {
    require('./main.js');
    let win = null;
    for (let i = 0; i < 40; i++) { const ws = BrowserWindow.getAllWindows(); if (ws.length) { win = ws[0]; break; } await tempo(250); }
    if (!win) { log('sem janela'); finish(false); return; }
    let alertFired = false;
    await win.webContents.executeJavaScript('window.alert = function(){ window.__alertFired = true; }; window.__alertFired = false;');
    win.webContents.on('console-message', (e) => { if (e.type === 'error') log('console.error: ' + e.message); });

    const payload = '<img src=x onerror="window.__alertFired=true">';
    const payload2 = '<script>window.__alertFired=true<\/script>';

    // Injeta divida maliciosa diretamente no estado e renderiza a view Dívidas.
    const r = await win.webContents.executeJavaScript(`(async function(){
      try {
        if (typeof estado === 'undefined' || !estado.dividas) return { ok:false, motivo:'estado.dividas ausente' };
        const id = 'xss-' + Date.now();
        estado.dividas.push({
          id, descricao: ${JSON.stringify(payload)}, credor: ${JSON.stringify(payload2)},
          observacao: ${JSON.stringify(payload)}, categoria: 'outros',
          parcelas: [{ id: id+'-p1', numero: 1, total: 100, valor: 100, vencimento: '2026-12-31', status: 'pendente' }],
          criadoEm: '2026-01-01'
        });
        setView('dividas');
        await new Promise(r => setTimeout(r, 400));
        const app = document.querySelector('#app');
        const html = app.innerHTML;
        const imgs = app.querySelectorAll('img').length;
        const scripts = app.querySelectorAll('script').length;
        const hasEscapedImg = html.includes('&lt;img') || html.includes('&lt;script');
        return { ok:true, imgs, scripts, hasEscapedImg,
                 alertFired: !!window.__alertFired,
                 contemPayload: html.includes(${JSON.stringify(payload)}) };
      } catch(e) { return { ok:false, motivo:String(e) }; }
    })()`);
    log('DIVIDAS: ' + JSON.stringify(r));

    // Testa modal com campo malicioso.
    const r2 = await win.webContents.executeJavaScript(`(function(){
      try {
        if (typeof abrirModal !== 'function') return { ok:false, motivo:'abrirModal ausente' };
        abrirModal('${'titulo<script>'.replace(/'/g, "\\'")}', [{ label: 'lab', name: 'descricao', value: ${JSON.stringify(payload)} }]);
        const f = document.querySelector('#form-modal');
        const html = f ? f.innerHTML : '';
        const imgs = f ? f.querySelectorAll('img').length : 0;
        return { ok:true, imgs, alertFired: !!window.__alertFired,
                 contemPayload: html.includes(${JSON.stringify(payload)}),
                 hasEscaped: html.includes('&lt;img') };
      } catch(e) { return { ok:false, motivo:String(e) }; }
    })()`);
    log('MODAL: ' + JSON.stringify(r2));

    const ok =
      r.ok && r.imgs === 0 && r.scripts === 0 && r.hasEscapedImg && !r.alertFired &&
      r2.ok && r2.imgs === 0 && !r2.alertFired && r2.hasEscaped;
    log(ok ? 'XSS: PASSOU (payloads renderizados como texto, sem elementos vivos)' : 'XSS: FALHOU');
    finish(ok);
  } catch (e) {
    log('erro fatal: ' + (e && e.stack || e));
    finish(false);
  }
});
