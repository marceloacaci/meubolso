// Validação funcional da Sprint 5 (itens já implementados: S5-4 atalhos,
// S5-1 busca/filtros, S5-5 ordenação/paginação, S5-2 CSV/PDF) em runtime real
// do Electron. Protege o DB real desativando `persistir`. Captura erros de console.
const { app, BrowserWindow } = require('electron');
const path = require('path');

const erros = [];
const log = (m) => console.log('[validate-s5] ' + m);
let fechou = false;
function finish(ok) {
  if (fechou) return; fechou = true;
  log(ok ? 'VALIDACAO S5 (parcial): PASSOU' : 'VALIDACAO S5 (parcial): FALHOU');
  setTimeout(() => { try { app.quit(); } catch (_) {} }, 300);
}

function tempo(m) { return new Promise(r => setTimeout(r, m)); }

app.whenReady().then(async () => {
  // Carrega o main.js real do app (registra IPC handlers + cria a janela).
  require('./main.js');

  // Espera a janela aparecer.
  let win = null;
  for (let i = 0; i < 40; i++) {
    const ws = BrowserWindow.getAllWindows();
    if (ws.length) { win = ws[0]; break; }
    await tempo(250);
  }
  if (!win) { log('FALHA: janela não criada'); finish(false); return; }
  win.webContents.on('console-message', (ev) => {
    if (ev.type === 'error' || ev.level === 3) erros.push('[console] ' + ev.message);
  });

  // Protege o DB real: persistir vira no-op.
  await win.webContents.executeJavaScript(`(function(){
    if (typeof persistir === 'function') { window.__persistir = persistir; persistir = function(){}; }
  })()`);
  await tempo(800); // deixa o estado carregar

  const resultados = [];
  const tick = () => tempo(350);

  // ---------- S5-4: atalhos ----------
  try {
    const r = await win.webContents.executeJavaScript(`(async function(){
      const out = {};
      const tick = () => new Promise(r => setTimeout(r, 350));
      try {
        // Estado inicial: painel
        setView('painel');
        await tick();
        // dispatch '3' -> deve ir para Pagamentos
        document.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true }));
        await tick();
        const txt3 = document.querySelector('#app') ? document.querySelector('#app').textContent : '';
        out.atalho3Ok = txt3.indexOf('Pagamentos') >= 0;
        // dispatch Ctrl+F -> deve focar o campo de busca (se houver na view)
        setView('dividas');
        await tick();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true }));
        await tick();
        const ativo = document.activeElement;
        out.ctrlFOk = !!(ativo && (ativo.id === 'busca' || ativo.tagName === 'INPUT'));
        out.ok = out.atalho3Ok || out.ctrlFOk;
      } catch(e){ out.ok = false; out.erro = e.message; }
      return out;
    })()`);
    resultados.push(['S5-4 atalhos', r.ok === true, JSON.stringify(r)]);
  } catch (e) { resultados.push(['S5-4 atalhos', false, e.message]); }

  // ---------- S5-1/S5-5: busca/filtros/ordenação/paginação (Dívidas) ----------
  try {
    await win.webContents.executeJavaScript("setView('dividas')");
    await tick();
    const r = await win.webContents.executeJavaScript(`(async function(){
      const out = {};
      const tick = () => new Promise(r => setTimeout(r, 350));
      try {
        // garante que há ao menos 1 dívida para filtrar
        if (estado.dividas.length === 0) {
          estado.dividas.push({ id: 'd-test', descricao: 'Netflix Assinatura', credor: 'Netflix', categoria: 'servico', parcelas: [], observacao: '' });
        }
        definirFiltro('texto', 'Netflix');
        await tick();
        const total = estado.dividas.length;
        const filtradas = filtrarDividas(estado.dividas, { texto: 'Netflix' }).length;
        out.buscaOk = filtradas >= 1 && filtradas <= total;
        // ordenação
        definirFiltro({ ordenar: 'total', asc: false });
        await tick();
        out.ordenarOk = estado.filtro.ordenar === 'total' && estado.filtro.asc === false;
        // paginação
        definirFiltro({ pagina: 1, porPagina: 5 });
        await tick();
        out.pagOk = typeof paginar === 'function' && paginar(estado.dividas, 1, 5).itens.length <= 5;
        // limpar
        limparFiltro();
        await tick();
        out.limparOk = !estado.filtro.texto && !estado.filtro.categoria;
        out.ok = true;
      } catch(e){ out.ok = false; out.erro = e.message; }
      return out;
    })()`);
    resultados.push(['S5-1/5 busca-filtro-ordem', r.ok === true && r.buscaOk && r.ordenarOk && r.pagOk && r.limparOk, JSON.stringify(r)]);
  } catch (e) { resultados.push(['S5-1/5 busca-filtro-ordem', false, e.message]); }

  // ---------- S5-2: CSV/PDF ----------
  try {
    const r = await win.webContents.executeJavaScript(`(function(){
      const out = {};
      try {
        out.temGerarCSV = typeof gerarCSV === 'function';
        out.temExportarCSV = typeof exportarCSV === 'function';
        out.temExportarPDF = typeof exportarPDF === 'function';
        const csv = gerarCSV();
        out.csvNaoVazio = typeof csv === 'string' && csv.length > 10;
        out.csvTemCabecalho = csv.indexOf('DÍVIDAS') >= 0;
        out.ok = out.temGerarCSV && out.temExportarCSV && out.temExportarPDF && out.csvNaoVazio && out.csvTemCabecalho;
      } catch(e){ out.ok = false; out.erro = e.message; }
      return out;
    })()`);
    resultados.push(['S5-2 CSV/PDF', r.ok === true, JSON.stringify(r)]);
  } catch (e) { resultados.push(['S5-2 CSV/PDF', false, e.message]); }

  // Relatório não deve quebrar (monta com os botões)
  try {
    await win.webContents.executeJavaScript("setView('relatorio')");
    await tick();
    const temBotoes = await win.webContents.executeJavaScript("!!document.querySelector('[data-acao=exportar-csv]') && !!document.querySelector('[data-acao=exportar-pdf]')");
    resultados.push(['S5-2 botoes relatorio', temBotoes === true, 'botoes=' + temBotoes]);
  } catch (e) { resultados.push(['S5-2 botoes relatorio', false, e.message]); }

  let pass = 0;
  for (const [nome, ok, det] of resultados) {
    log((ok ? 'PASS ' : 'FAIL ') + nome + ' :: ' + det);
    if (ok) pass++;
  }
  log('Erros de console: ' + (erros.length ? erros.join(' | ') : 'nenhum'));
  log('RESUMO: ' + pass + '/' + resultados.length + ' validações passaram');
  finish(pass === resultados.length && erros.length === 0);
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
setTimeout(() => { log('TIMEOUT — encerrando'); finish(false); }, 90000);
