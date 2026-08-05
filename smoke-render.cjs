// Smoke test de render real (S3-5): abre o app no Electron, vai ao Painel e
// conta pixels nao-brancos dos <canvas> dos graficos Chart.js (via getImageData
// no renderer). Se algum grafico estiver em branco (0 pixels desenhados), o
// teste FALHA. Usa executeJavaScript (funciona no renderer); capturePage() fica
// como artefato de inspecao.
//
// Uso: node scripts/smoke-render.cjs
const electron = require('electron');
const path = require('path');
const fs = require('fs');

function dadosTeste() {
  // Fixture que produz graficos coloridos no painel (testada anteriormente).
  return {
    dividas: [
      { id: 'd1', descricao: 'Cartao X', categoria: 'cartao',
        parcelas: [{ id: 'd1p1', numero: 1, valor: 1200, vencimento: '2026-02-15', status: 'pendente', valorPago: 0, dataPagamento: '', nota: '' }] },
      { id: 'd2', descricao: 'Carro', categoria: 'emprestimo',
        parcelas: [
          { id: 'd2p1', numero: 1, valor: 30000, vencimento: '2026-03-10', status: 'pago', valorPago: 30000, dataPagamento: '2026-01-10', nota: '' },
          { id: 'd2p2', numero: 2, valor: 30000, vencimento: '2026-04-10', status: 'pendente', valorPago: 0, dataPagamento: '', nota: '' }
        ] }
    ],
    pagamentos: [
      { id: 'p1', dividaId: 'd1', parcelaId: 'd1p1', valor: 400, data: '2026-01-20', criadoEm: '2026-01-20' },
      { id: 'p2', dividaId: 'd2', parcelaId: 'd2p1', valor: 2500, data: '2026-01-10', criadoEm: '2026-01-10' }
    ],
    carteiras: [],
    configuracoes: { moeda: 'BRL', idioma: 'pt', tema: 'light', acento: 'verde' },
    gamificacao: { xp: 50, nivel: 2, ultimoAcesso: '2026-08-04', historico: [] }
  };
}

async function main() {
  const dir = path.join(process.env.APPDATA, 'Electron');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'meubolso.json'), JSON.stringify(dadosTeste()));
  require('./main.js');
  const BW = electron.BrowserWindow;
  let win = null, t = 0;
  while (t++ < 120) { const ws = BW.getAllWindows(); if (ws.length) { win = ws[ws.length - 1]; break; } await new Promise(r => setTimeout(r, 100)); }
  if (!win) { console.error('FALHA: janela nao capturada'); process.exit(1); }
  win.webContents.on('console-message', (e, level, msg) => { if (level === 2) console.error('[renderer]', msg.slice(0, 200)); });
  await new Promise(r => setTimeout(r, 8000));

  const contar = `(function(){
    try {
      const canvases = Array.from(document.querySelectorAll('canvas'));
      // Ignora o canvas de confete de level-up (fica em branco quando nao ha
      // animacao de subida de nivel — comportamento esperado, nao grafico).
      const graficos = canvases.filter(c => (c.id || '').indexOf('levelup-confetti') === -1);
      const out = [];
      for (const c of graficos) {
        const ctx = c.getContext('2d');
        const w = c.width, h = c.height;
        if (!w || !h) { out.push({ w, h, naoBrancos: -1 }); continue; }
        const d = ctx.getImageData(0, 0, w, h).data;
        let naoBrancos = 0;
        for (let p = 0; p < d.length; p += 4) {
          const r = d[p], g = d[p+1], b = d[p+2], a = d[p+3];
          if (a > 10 && !(r > 245 && g > 245 && b > 245)) naoBrancos++;
        }
        out.push({ w, h, naoBrancos });
      }
      return JSON.stringify(out);
    } catch (e) { return JSON.stringify({ erro: e.message }); }
  })()`;

  let res;
  try { res = await Promise.race([ win.webContents.executeJavaScript(contar), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout-exec')), 25000)) ]); }
  catch (e) { res = JSON.stringify({ execErro: e.message }); }

  // Artefato de inspecao (pode vir em branco em janela oculta — nao eh o criterio).
  try { const img = await win.webContents.capturePage(); fs.writeFileSync(path.join(__dirname, 'smoke.png'), img.toPNG()); } catch (_) {}

  const lista = JSON.parse(res);
  if (lista.erro || lista.execErro) { console.error('FALHA ao contar pixels:', lista.erro || lista.execErro); try { fs.unlinkSync(path.join(dir, 'meubolso.json')); } catch (_) {} process.exit(1); }

  console.log('Canvas encontrados:', lista.length);
  let falha = false;
  lista.forEach((c, i) => {
    const ok = c.naoBrancos === undefined ? false : c.naoBrancos > 50;
    if (!ok) falha = true;
    console.log('  canvas[' + i + '] ' + c.w + 'x' + c.h + ' naoBrancos=' + c.naoBrancos + (ok ? ' OK' : ' <-- EM BRANCO'));
  });
  try { fs.unlinkSync(path.join(dir, 'meubolso.json')); } catch (_) {}
  if (falha) { console.error('FALHA: ha grafico em branco no painel.'); process.exit(1); }
  console.log('SUCESSO: todos os canvas do painel tem pixels desenhados (grafico nao esta em branco).');
  process.exit(0);
}
main().catch(e => { console.error('ERRO', e); process.exit(1); });
setTimeout(() => { console.error('TIMEOUT'); process.exit(1); }, 60000);
