const { app, BrowserWindow, ipcMain, dialog, shell, screen } = require('electron');
const path = require('path');
const fs = require('fs');

// ============================================================
// MEUBOLSO - Persistência simples com JSON
// ============================================================
// Salva os dados do app diretamente como arquivo JSON no
// diretório userData do Electron. Simples, confiável e sem
// dependências externas de banco de dados.
// ============================================================

let userDataPath, dbFile, dataFile, backupFile, pontosFile;

// Caminhos de dados
function initPaths() {
  userDataPath = app.getPath('userData');
  dbFile = path.join(userDataPath, 'meubolso.json');
  dataFile = path.join(userDataPath, 'dados.json');
  backupFile = path.join(userDataPath, 'dados.bak.json');
  pontosFile = path.join(userDataPath, 'pontos.bak.json');
}

// ---------- Normalizar dados ----------
function normalizar(d) {
  d.dividas = Array.isArray(d.dividas) ? d.dividas : [];
  d.pagamentos = Array.isArray(d.pagamentos) ? d.pagamentos : [];
  d.carteiras = Array.isArray(d.carteiras) ? d.carteiras : [];
  d.configuracoes = d.configuracoes || { moeda: 'BRL' };
  return d;
}

// ---------- Backup automático (cópia da última versão válida) ----------
// Antes de sobrescrever o arquivo principal, copia o conteúdo atual para
// dados.bak.json. Assim, se a gravação falhar ou os dados ficarem
// corrompidos, há sempre a última versão íntegra para restaurar.
function fazerBackup() {
  try {
    if (!fs.existsSync(dbFile)) return false;
    const stat = fs.statSync(dbFile);
    if (stat.size === 0) return false; // não backupa arquivo vazio
    fs.copyFileSync(dbFile, backupFile);
    // Backup separado da pontuação (XP, nível e histórico de conquistas),
    // conforme solicitado — garante resiliência do "game" mesmo se o JSON
    // principal for corrompido.
    try {
      const conteudo = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
      const g = conteudo.gamificacao || { xp: 0, nivel: 1, historico: [] };
      fs.writeFileSync(pontosFile, JSON.stringify(g, null, 2), 'utf8');
    } catch (_) { /* gamificacao ausente ou ilegível: ignora */ }
    return true;
  } catch (err) {
    console.warn('[DB] ⚠ Falha ao fazer backup automático:', err.message);
    return false;
  }
}

// ---------- Salvar dados IMEDIATAMENTE no disco ----------
function saveToDB(data) {
  if (!data) {
    console.error('[DB] × Nenhum dado para salvar');
    return false;
  }
  // Backup da versão anterior antes de sobrescrever
  fazerBackup();
  try {
    const json = JSON.stringify(normalizar(data));
    fs.writeFileSync(dbFile, json, 'utf8');
    console.log('[DB] ✓ Dados salvos (' + json.length + ' bytes)');
    return true;
  } catch (err) {
    console.error('[DB] ✗ Erro ao salvar:', err.message);
    return false;
  }
}

// ---------- Carregar dados do JSON ----------
function loadFromDB() {
  if (!fs.existsSync(dbFile)) {
    console.log('[DB] ℹ Nenhum arquivo de dados encontrado');
    return null;
  }
  try {
    const content = fs.readFileSync(dbFile, 'utf8');
    const parsed = JSON.parse(content);
    if (parsed && Array.isArray(parsed.dividas) && Array.isArray(parsed.pagamentos)) {
      console.log('[DB] ✓ Dados carregados:', parsed.dividas.length, 'dívidas');
      return normalizar(parsed);
    }
    console.log('[DB] ⚠ Formato de dados inválido');
    return null;
  } catch (err) {
    console.error('[DB] ✗ Erro ao carregar:', err.message);
    return null;
  }
}

function fallbackData() {
  return { dividas: [], pagamentos: [], carteiras: [], configuracoes: { moeda: 'BRL' } };
}

// ============================================================
// JANELA PRINCIPAL
// ============================================================
function createWindow() {
  let area = { width: 1366, height: 768 };
  try { if (screen && screen.getPrimaryDisplay) area = screen.getPrimaryDisplay().workAreaSize; } catch (_) {}

  const W = Math.min(1366, Math.max(1024, area.width));
  const H = Math.min(800, Math.max(700, area.height));

  const win = new BrowserWindow({
    width: W,
    height: H,
    minWidth: W,
    minHeight: H,
    title: 'MeuBolso',
    backgroundColor: '#fafafa',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setMinimumSize(W, H);
  win.setSize(W, H, false);
  if (typeof win.center === 'function') win.center();
  win.removeMenu();
  win.loadFile('index.html');
}

// ============================================================
// IPC HANDLERS
// ============================================================
ipcMain.handle('dados:carregar', async () => {
  console.log('[IPC] dados:carregar');
  const data = loadFromDB() || fallbackData();
  console.log('[IPC] dados:carregar - retornando', data.dividas.length, 'dívidas');
  return data;
});

ipcMain.handle('dados:salvar', (_evt, data) => {
  console.log('[IPC] dados:salvar (IMEDIATO)');
  const ok = saveToDB(data);
  return ok;
});

ipcMain.handle('dados:salvar-agora', async (_evt, data) => {
  console.log('[IPC] dados:salvar-agora - SALVANDO IMEDIATAMENTE');
  const ok = saveToDB(data);
  console.log('[IPC] dados:salvar-agora - resultado:', ok ? 'OK' : 'FALHA');
  return ok;
});

ipcMain.handle('dados:caminho', () => dbFile);

ipcMain.handle('sistema:info', () => ({
  appVersion: app.getVersion(),
  electron: process.versions.electron,
  node: process.versions.node,
  chrome: process.versions.chrome,
  so: `${process.platform} ${process.arch}`,
  arquitetura: process.arch,
  dbType: 'JSON (arquivo simples)',
  backup: 'automático (dados.bak.json a cada salvamento) + exportar/importar manual',
}));

ipcMain.handle('dados:fazer-backup', async () => {
  const ok = fazerBackup();
  return { ok, caminho: ok ? backupFile : null };
});

ipcMain.handle('dados:backup-info', () => {
  if (!fs.existsSync(backupFile)) return { existe: false };
  try {
    const stat = fs.statSync(backupFile);
    return { existe: true, modificadoEm: stat.mtime.toISOString(), tamanho: stat.size };
  } catch (err) {
    return { existe: false, erro: err.message };
  }
});

ipcMain.handle('dados:restaurar', async () => {
  if (!fs.existsSync(backupFile)) {
    return { ok: false, erro: 'Não há backup local.' };
  }
  try {
    const conteudo = fs.readFileSync(backupFile, 'utf8');
    const parsed = JSON.parse(conteudo);
    if (!parsed || !Array.isArray(parsed.dividas) || !Array.isArray(parsed.pagamentos)) {
      return { ok: false, erro: 'O arquivo de backup está corrompido.' };
    }
    return { ok: true, dados: parsed };
  } catch (err) {
    return { ok: false, erro: `Backup ilegível: ${err.message}` };
  }
});

ipcMain.handle('janela:flash-foco', (evt) => {
  const win = BrowserWindow.fromWebContents(evt.sender);
  if (!win) return false;
  evt.sender.invalidate();
  if (win.isFocused()) win.blur();
  win.focus();
  return true;
});

ipcMain.handle('link:abrir', (_evt, url) => {
  if (typeof url !== 'string') return false;
  if (!/^https?:\/\//i.test(url)) return false;
  try { shell.openExternal(url); return true; }
  catch (err) { console.error('Falha ao abrir link:', err); return false; }
});

ipcMain.handle('dados:exportar', async (evt) => {
  const win = BrowserWindow.fromWebContents(evt.sender);
  const result = await dialog.showSaveDialog(win, {
    title: 'Exportar dados',
    defaultPath: 'meubolso-' + new Date().toISOString().slice(0, 10) + '.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (result.canceled || !result.filePath) return { ok: false, cancelado: true };
  try {
    const data = loadFromDB() || fallbackData();
    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf8');
    return { ok: true, caminho: result.filePath };
  } catch (err) {
    return { ok: false, erro: err.message };
  }
});

ipcMain.handle('dados:importar', async (evt) => {
  const win = BrowserWindow.fromWebContents(evt.sender);
  const result = await dialog.showOpenDialog(win, {
    title: 'Importar dados',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (result.canceled || !result.filePaths[0]) return { ok: false, cancelado: true };
  try {
    const conteudo = fs.readFileSync(result.filePaths[0], 'utf8');
    const parsed = JSON.parse(conteudo);
    if (!parsed || !Array.isArray(parsed.dividas) || !Array.isArray(parsed.pagamentos)) {
      return { ok: false, erro: 'Arquivo inválido: faltam campos "dividas" ou "pagamentos".' };
    }
    return { ok: true, dados: parsed, caminho: result.filePaths[0] };
  } catch (err) {
    return { ok: false, erro: 'Não foi possível ler o arquivo: ' + err.message };
  }
});

function iniciarAutoUpdate() {
  if (!app.isPackaged) return;
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.warn('Verificação de atualização falhou:', err.message);
    });
    autoUpdater.on('update-available', () => console.log('Atualização disponível — baixando...'));
    autoUpdater.on('update-downloaded', () => console.log('Atualização baixada — será instalada ao fechar.'));
  } catch (err) {
    console.warn('Auto-update indisponível:', err.message);
  }
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================
app.whenReady().then(() => {
  console.log('========================================');
  console.log('[APP] MeuBolso iniciando...');
  console.log('[APP] Backend de persistência: JSON (arquivo simples)');
  console.log('========================================');

  initPaths();
  iniciarAutoUpdate();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ============================================================
// ENCERRAMENTO - Garantir que dados sejam salvos
// ============================================================
app.on('before-quit', () => {
  console.log('[APP] before-quit - dados já salvos no disco na última chamada de persistir()');
  console.log('[APP] ✓ Aplicação encerrada');
});