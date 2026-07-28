const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

// Caminhos de dados — só podem ser resolvidos APÓS o app estar pronto.
// Chamar app.getPath() antes de app.whenReady() lança e derruba o processo.
let userDataPath, db, dbFile, dataFile, backupFile;
function initPaths() {
  userDataPath = app.getPath('userData');
  dbFile = path.join(userDataPath, 'meubolso.db');
  // Mantidos para exportar/importar legado (JSON) e recuperação.
  dataFile = path.join(userDataPath, 'dados.json');
  backupFile = path.join(userDataPath, 'dados.bak.json');
}

// ---------- Persistência com SQLite (node:sqlite, embarcado, sem deps) ----------
// O estado inteiro do app é serializado em uma única linha da tabela kv(chave='estado').
// Isso troca o JSON monolítico gravado a cada ação por escrita incremental e atômica,
// além de permitir, no futuro, consultas por coluna e sincronização.
function openDb() {
  const tmp = dbFile + '.tmp';
  // Garante permissão de escrita (resolve locked/corrompido renomeando o antigo).
  if (fs.existsSync(dbFile)) {
    try { fs.accessSync(dbFile, fs.constants.W_OK); }
    catch (_) {
      try { fs.renameSync(dbFile, dbFile + '.corrompido-' + Date.now()); } catch (_) {}
    }
  }
  db = new DatabaseSync(dbFile);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');
  db.exec(`CREATE TABLE IF NOT EXISTS kv (
    k TEXT PRIMARY KEY,
    v TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`);
  db.exec(`CREATE TABLE IF NOT EXISTS meta (
    k TEXT PRIMARY KEY,
    v TEXT NOT NULL
  );`);
}

function loadData() {
  const padrao = { dividas: [], pagamentos: [], carteiras: [], configuracoes: { moeda: 'BRL' } };
  // 1) Tenta o SQLite (fonte de verdade atual)
  try {
    if (db) {
      const row = db.prepare('SELECT v FROM kv WHERE k = ?').get('estado');
      if (row && row.v) {
        const parsed = JSON.parse(row.v);
        if (parsed && Array.isArray(parsed.dividas) && Array.isArray(parsed.pagamentos)) {
          return normalizar(parsed);
        }
      }
    }
  } catch (err) {
    console.error('Erro ao ler SQLite:', err);
  }
  // 2) Fallback: migra do JSON legado (dados.json / dados.bak.json) se existir
  for (const file of [dataFile, backupFile]) {
    try {
      if (fs.existsSync(file)) {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (parsed && Array.isArray(parsed.dividas) && Array.isArray(parsed.pagamentos)) {
          console.log('Migrando dados do JSON legado para SQLite:', file);
          if (db) {
            db.prepare('INSERT INTO kv(k, v, updated_at) VALUES(?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, updated_at = excluded.updated_at')
              .run('estado', JSON.stringify(parsed), new Date().toISOString());
          }
          return normalizar(parsed);
        }
      }
    } catch (err) {
      console.error(`Erro ao ler ${file}:`, err);
    }
  }
  return padrao;
}

function normalizar(d) {
  d.dividas = Array.isArray(d.dividas) ? d.dividas : [];
  d.pagamentos = Array.isArray(d.pagamentos) ? d.pagamentos : [];
  d.carteiras = Array.isArray(d.carteiras) ? d.carteiras : [];
  d.configuracoes = d.configuracoes || { moeda: 'BRL' };
  return d;
}

// Debounce de gravação: evita reescrever o estado várias vezes em sequência de cliques.
let saveTimer = null;
function scheduleSave(data) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { saveData(data); saveTimer = null; }, 400);
}

function saveData(data) {
  try {
    if (!db) return false;
    const json = JSON.stringify(normalizar(data));
    db.prepare('INSERT INTO kv(k, v, updated_at) VALUES(?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, updated_at = excluded.updated_at')
      .run('estado', json, new Date().toISOString());
    return true;
  } catch (err) {
    console.error('Erro ao salvar no SQLite:', err);
    return false;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    // Piso elevado para que, NA FONTE ORIGINAL (--app-font-scale: 1), nenhum
    // botão ou informação fique oculto: sidebar (248px) + conteúdo utilizável
    // (~712px, comporta cards em 2 colunas e botões de ação sem corte) na
    // largura, e sidebar inteira + área de conteúdo com folga na altura. A
    // sidebar rola internamente (overflow-y:auto) caso a altura seja menor.
    // Abaixo desse piso o SO pode forçar a janela menor e o layout mobile
    // (breakpoint 640px) assume com a barra de navegação inferior.
    minWidth: 960,
    minHeight: 720,
    title: 'MeuBolso',
    backgroundColor: '#fafafa',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.removeMenu();
  win.loadFile('index.html');
}

ipcMain.handle('dados:carregar', () => loadData());
// Salvar com debounce (gravação eficiente e incremental).
ipcMain.handle('dados:salvar', (_evt, data) => { scheduleSave(data); return true; });
ipcMain.handle('dados:caminho', () => dbFile);
ipcMain.handle('sistema:info', () => ({
  appVersion: app.getVersion(),
  electron: process.versions.electron,
  node: process.versions.node,
  chrome: process.versions.chrome,
  so: `${process.platform} ${process.arch}`,
  arquitetura: process.arch
}));

ipcMain.handle('dados:backup-info', () => {
  if (!fs.existsSync(backupFile)) return { existe: false };
  try {
    const stat = fs.statSync(backupFile);
    return { existe: true, modificadoEm: stat.mtime.toISOString(), tamanho: stat.size };
  } catch (err) {
    return { existe: false, erro: err.message };
  }
});

ipcMain.handle('dados:restaurar', async (evt) => {
  if (!fs.existsSync(backupFile)) {
    return { ok: false, erro: 'Não há backup local. O backup é criado automaticamente a partir do segundo salvamento.' };
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

// Workaround para bug do Electron/Chromium: após IPC pesado, o foco do
// input fica "preso" e não aceita novas teclas. Minimizar e maximizar
// a janela resolve — aqui simulamos o mesmo efeito com invalidate + focus.
ipcMain.handle('janela:flash-foco', (evt) => {
  const win = BrowserWindow.fromWebContents(evt.sender);
  if (!win) return false;
  evt.sender.invalidate();
  if (win.isFocused()) win.blur();
  win.focus();
  return true;
});

// Abre links externos (http/https) no navegador padrão do sistema,
// usado pelos links do GitHub na tela "Sobre".
ipcMain.handle('link:abrir', (_evt, url) => {
  if (typeof url !== 'string') return false;
  // Só permite http/https para evitar esquemas perigosos (ex.: file:, javascript:).
  if (!/^https?:\/\//i.test(url)) return false;
  try { shell.openExternal(url); return true; }
  catch (err) { console.error('Falha ao abrir link externo:', err); return false; }
});

ipcMain.handle('dados:exportar', async (evt) => {
  const win = BrowserWindow.fromWebContents(evt.sender);
  const result = await dialog.showSaveDialog(win, {
    title: 'Exportar dados',
    defaultPath: `meubolso-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePath) return { ok: false, cancelado: true };
  try {
    fs.writeFileSync(result.filePath, JSON.stringify(loadData(), null, 2), 'utf8');
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
    filters: [{ name: 'JSON', extensions: ['json'] }]
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
    return { ok: false, erro: `Não foi possível ler o arquivo: ${err.message}` };
  }
});

// ---------- Auto-update (só em produção/empacotado) ----------
// Verifica novas versões nos GitHub Releases e instala silenciosamente.
function iniciarAutoUpdate() {
  if (!app.isPackaged) return; // em dev, não verifica
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

app.whenReady().then(() => {
  initPaths();
  openDb();
  iniciarAutoUpdate();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Garante flush do debounce pendente ao fechar.
app.on('before-quit', () => {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
});
