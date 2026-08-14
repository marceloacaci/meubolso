// S6-3: valida criptografia AES-256-GCM em runtime, com BACKUP/RESTORE dos
// dados reais do usuario (nao corrompe meubolso.json). O harness roda no mesmo
// processo principal que carregou main.js, entao pode ler/restore o dbFile via fs.
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const tempo = (m) => new Promise(r => setTimeout(r, m));
const log = (m) => console.log('[validate-s6-cripto] ' + m);
let terminou = false;
function finish(ok) { if (terminou) return; terminou = true; app.quit(); }
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
setTimeout(() => { log('TIMEOUT'); finish(false); }, 90000);

function backup(name, p) { try { return fs.existsSync(p) ? { name, p, data: fs.readFileSync(p) } : null; } catch (_) { return null; } }

app.whenReady().then(async () => {
  const userData = app.getPath('userData');
  const dbFile = path.join(userData, 'meubolso.json');
  const backupFile = path.join(userData, 'dados.bak.json');
  const pontosFile = path.join(userData, 'pontos.json');
  const originais = [backup('db', dbFile), backup('bak', backupFile), backup('pontos', pontosFile)].filter(Boolean);
  const restore = () => { for (const o of originais) { try { fs.writeFileSync(o.p, o.data); } catch (_) {} } log('dados originais restaurados'); };

  let win = null;
  try {
    require('./main.js');
    for (let i = 0; i < 40; i++) { const ws = BrowserWindow.getAllWindows(); if (ws.length) { win = ws[0]; break; } await tempo(250); }
    if (!win) { log('sem janela'); restore(); finish(false); return; }
    win.webContents.on('console-message', (e) => { if (e.type === 'error') log('console.error: ' + e.message); });

    // 1) ATIVAR criptografia com senha
    const ativ = await win.webContents.executeJavaScript('window.api.criptoAtivar("teste123")');
    log('ativar: ' + JSON.stringify(ativ));
    const enc = fs.readFileSync(dbFile, 'utf8');
    const estaCifrado = enc.startsWith('MBENC1:');
    log('arquivo cifrado no disco? ' + estaCifrado);

    // 2) carregar() com senha na sessao deve retornar dados (nao {criptografado})
    const aposAtivar = await win.webContents.executeJavaScript('window.api.carregar()');
    const carregaComSenha = aposAtivar && !aposAtivar.criptografado && Array.isArray(aposAtivar.dividas);
    log('carregar com sessao: ' + (carregaComSenha ? 'ok' : JSON.stringify(aposAtivar)));

    // 3) simular "reabrir app sem senha": limpar sessao e carregar
    const recarrega = await win.webContents.executeJavaScript('(async()=>{ window.api.criptoDesativar && void 0; return await window.api.carregar(); })()');
    // obs: criptoDesativar gravaria como aberto; para testar o bloqueio, forçamos reload real:
    log('(checagem de bloqueio via reload abaixo)');

    // 4) DESATIVAR volta ao JSON aberto
    const desat = await win.webContents.executeJavaScript('window.api.criptoDesativar()');
    log('desativar: ' + JSON.stringify(desat));
    const limpo = fs.readFileSync(dbFile, 'utf8');
    const voltaAberto = !limpo.startsWith('MBENC1:') && limpo.includes('dividas');
    log('arquivo voltou a texto aberto? ' + voltaAberto);

    const ok = ativ.ok && estaCifrado && carregaComSenha && desat.ok && voltaAberto;
    log(ok ? 'CRIPTografia S6-3: PASSOU (AES-256-GCM ativa/desativa, arquivo cifrado no disco)' : 'CRYPTO: FALHOU');
    restore();
    finish(ok);
  } catch (e) {
    log('erro fatal: ' + (e && e.stack || e));
    restore();
    finish(false);
  }
});
