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

let userDataPath, dbFile, dataFile, backupFile, pontosFile, backupsDir;
// Ambiente de execução: 'dev' (npm start), 'portatil' (portable baixado) ou
// 'instalado' (setup.exe instalado). Usado para separar os dados de cada
// ambiente e para exibir na página "Sobre".
let ambienteAtual = 'dev';

const { resolverCaminhoDados } = require('./src/caminhos-dados');

// Caminhos de dados — separados por ambiente para NÃO misturar entradas:
//   dev       -> %APPDATA%/meubolso/                      (como era antes)
//   portatil  -> pasta do próprio executável portable     (leva o .exe e os dados juntos)
//   instalado -> %APPDATA%/meubolso/<versao>/               (isolado por versão do release)
function initPaths() {
  const versao = app.getVersion() || '0.0.0';
  const { ambiente, base } = resolverCaminhoDados({
    isPackaged: app.isPackaged,
    portableDir: process.env.PORTABLE_EXECUTABLE_DIR,
    userData: app.getPath('userData'),
    versao
  });
  ambienteAtual = ambiente;
  userDataPath = base;
  dbFile = path.join(userDataPath, 'meubolso.json');
  dataFile = path.join(userDataPath, 'dados.json');
  backupFile = path.join(userDataPath, 'dados.bak.json');
  pontosFile = path.join(userDataPath, 'pontos.bak.json');
  backupsDir = path.join(userDataPath, 'backups');
}

// ---------- Normalizar dados ----------
function normalizar(d) {
  d.dividas = Array.isArray(d.dividas) ? d.dividas : [];
  d.pagamentos = Array.isArray(d.pagamentos) ? d.pagamentos : [];
  d.carteiras = Array.isArray(d.carteiras) ? d.carteiras : [];
  d.recorrentes = Array.isArray(d.recorrentes) ? d.recorrentes : [];
  d.metas = Array.isArray(d.metas) ? d.metas : [];
  d.configuracoes = d.configuracoes || { moeda: 'BRL' };
  if (typeof d.configuracoes.criptografia !== 'object' || d.configuracoes.criptografia === null) {
    d.configuracoes.criptografia = { ativa: false };
  }
  if (typeof d.configuracoes.criptografia.ativa !== 'boolean') d.configuracoes.criptografia.ativa = false;
  return d;
}

const cripto = require('./src/cripto.js');
// Senha em memoria (sessao). Definida quando o usuario desbloqueia/ativa a cripto.
let senhaSessao = null;

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
    // principal for corrompido. Escrita atômica para não deixar pontos.bak.json
    // pela metade.
    try {
      const conteudo = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
      const g = conteudo.gamificacao || { xp: 0, nivel: 1, historico: [] };
      salvarArquivoAtomico(pontosFile, JSON.stringify(g, null, 2));
    } catch (_) { /* gamificacao ausente ou ilegível: ignora */ }
    // Backup ROTATIVO (S2-5): empurra uma nova geração com timestamp em backups/,
    // mantendo só as BACKUP_GERACOES mais recentes. Protege contra corrupção
    // percebida tardiamente — há até 7 cópias anteriores para restaurar.
    try { fazerBackupRotativo(dbFile, backupsDir); } catch (_) { /* ignora falha do rotativo */ }
    return true;
  } catch (err) {
    console.warn('[DB] ⚠ Falha ao fazer backup automático:', err.message);
    return false;
  }
}

// ---------- Escrita ATÔMICA de arquivo + BACKUP ROTATIVO ----------
// (Implementação em src/persistencia.js — testável em Node, sem Electron.)
const {
  salvarArquivoAtomico,
  fazerBackupRotativo,
  listarBackups,
  restaurarBackup,
  BACKUP_GERACOES
} = require('./src/persistencia.js');
function saveToDB(data) {
  if (!data) {
    console.error('[DB] × Nenhum dado para salvar');
    return false;
  }
  // Backup da versão anterior antes de sobrescrever
  fazerBackup();
  try {
    const cfg = (data.configuracoes && data.configuracoes.criptografia) || { ativa: false };
    let conteudo = JSON.stringify(normalizar(data));
    if (cfg.ativa && senhaSessao) {
      conteudo = cripto.criptografar(senhaSessao, conteudo);
    }
    salvarArquivoAtomico(dbFile, conteudo);
    console.log('[DB] ✓ Dados salvos (' + conteudo.length + ' bytes' + (cfg.ativa ? ', criptografado' : '') + ')');
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
  // Tenta o arquivo principal. Se estiver corrompido/inválido, recorre ao
  // backup automático (dados.bak.json, gerado a cada salvamento em saveToDB).
  const ler = (caminho) => {
    const content = fs.readFileSync(caminho, 'utf8');
    // Arquivo criptografado: precisa de senha para descriptografar.
    if (cripto.eArquivoCriptografado(content)) {
      if (!senhaSessao) return { __criptografado: true };
      const json = cripto.descriptografar(senhaSessao, content);
      return JSON.parse(json);
    }
    const parsed = JSON.parse(content);
    if (parsed && Array.isArray(parsed.dividas) && Array.isArray(parsed.pagamentos)) {
      return parsed;
    }
    throw new Error('formato inválido (sem dividas/pagamentos)');
  };
  try {
    const parsed = ler(dbFile);
    if (parsed && parsed.__criptografado) return { __criptografado: true };
    console.log('[DB] ✓ Dados carregados:', parsed.dividas.length, 'dívidas');
    return normalizar(parsed);
  } catch (err) {
    console.error('[DB] ✗ Erro ao carregar principal:', err.message);
  }
  // Recuperação a partir do backup.
  if (fs.existsSync(backupFile)) {
    try {
      const parsed = ler(backupFile);
      console.warn('[DB] ⚠ Principal inválido; recuperado do backup:', backupFile);
      // Re-salva a versão recuperada como principal, corrigindo o arquivo quebrado.
      try { salvarArquivoAtomico(dbFile, JSON.stringify(normalizar(parsed))); } catch (_) {}
      return normalizar(parsed);
    } catch (err2) {
      console.error('[DB] ✗ Backup também inválido:', err2.message);
    }
  }
  console.error('[DB] ✗ Falha ao carregar (principal e backup inválidos)');
  return null;
}

function fallbackData() {
  return { dividas: [], pagamentos: [], carteiras: [], recorrentes: [], metas: [], lixeira: { dividas: [], pagamentos: [], carteiras: [], recorrentes: [], metas: [] }, configuracoes: { moeda: 'BRL' } };
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
  const data = loadFromDB();
  if (data && data.__criptografado) {
    console.log('[IPC] dados:carregar - arquivo criptografado; aguardando senha');
    return { criptografado: true };
  }
  const normalizado = data || fallbackData();
  console.log('[IPC] dados:carregar - retornando', normalizado.dividas.length, 'dívidas');
  return normalizado;
});

// S6-3: verifica a senha contra o arquivo criptografado e, se ok, fixa na sessao.
ipcMain.handle('cripto:desbloquear', async (_evt, senha) => {
  try {
    if (!fs.existsSync(dbFile)) return { ok: false, erro: 'sem arquivo' };
    const content = fs.readFileSync(dbFile, 'utf8');
    if (!cripto.eArquivoCriptografado(content)) return { ok: true, criptografado: false };
    cripto.descriptografar(senha, content); // lanca se senha errada (GCM)
    senhaSessao = senha;
    return { ok: true, criptografado: true };
  } catch (e) {
    return { ok: false, erro: 'senha incorreta' };
  }
});

// S6-3: troca a senha da criptografia re-salvando o arquivo ja descriptografado.
ipcMain.handle('cripto:ativar', async (_evt, senha) => {
  if (!senha || !senha.length) return { ok: false, erro: 'senha vazia' };
  senhaSessao = senha;
  // marca ativa e re-salva (saveToDB criptografa usando senhaSessao)
  const atual = loadFromDB();
  if (atual && !atual.__criptografado) {
    atual.configuracoes = atual.configuracoes || {};
    atual.configuracoes.criptografia = { ativa: true };
    saveToDB(atual);
  }
  return { ok: true };
});

ipcMain.handle('cripto:desativar', async () => {
  // Descriptografa ANTES de limpar a senha da sessão (senão o arquivo cifrado
  // não pode ser lido e o re-salvamento em texto aberto é pulado).
  const atual = loadFromDB();
  if (!atual || atual.__criptografado) return { ok: false, erro: 'nao foi possivel descriptografar' };
  senhaSessao = null;
  atual.configuracoes = atual.configuracoes || {};
  atual.configuracoes.criptografia = { ativa: false };
  saveToDB(atual);
  return { ok: true };
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
  ambiente: ambienteAtual,
  caminhoDados: dbFile,
  electron: process.versions.electron,
  node: process.versions.node,
  chrome: process.versions.chrome,
  so: `${process.platform} ${process.arch}`,
  arquitetura: process.arch,
  dbType: 'JSON (arquivo simples)',
  backup: `automático rotativo (${BACKUP_GERACOES} gerações em backups/ + dados.bak.json) + exportar/importar manual`,
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

// ---------- Backup rotativo (S2-5) ----------
// Lista as gerações disponíveis em backups/ (mais recente primeiro).
ipcMain.handle('dados:listar-backups', async () => {
  const geracoes = listarBackups(backupsDir);
  return {
    geracoes,
    limite: BACKUP_GERACOES,
    pasta: backupsDir
  };
});

// Restaura uma geração específica (pelo nome de arquivo retornado por listar-backups).
ipcMain.handle('dados:restaurar-backup', async (_evt, arquivo) => {
  if (!arquivo) return { ok: false, erro: 'Nenhum arquivo informado.' };
  // Validação de caminho: só aceita nomes dentro da pasta de backups (evita
  // travar/escrever fora de backupsDir via path traversal).
  const caminho = path.join(backupsDir, path.basename(arquivo));
  if (!fs.existsSync(caminho)) {
    return { ok: false, erro: 'Arquivo de backup não encontrado.' };
  }
  try {
    const conteudo = fs.readFileSync(caminho, 'utf8');
    const parsed = JSON.parse(conteudo);
    if (!parsed || !Array.isArray(parsed.dividas) || !Array.isArray(parsed.pagamentos)) {
      return { ok: false, erro: 'O backup selecionado está corrompido.' };
    }
    const ok = restaurarBackup(caminho, dbFile);
    return { ok, arquivo };
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

ipcMain.handle('dados:exportar-csv', async (evt, conteudo, nomeSugerido) => {
  const win = BrowserWindow.fromWebContents(evt.sender);
  const result = await dialog.showSaveDialog(win, {
    title: 'Exportar CSV',
    defaultPath: nomeSugerido || ('meubolso-' + new Date().toISOString().slice(0, 10) + '.csv'),
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });
  if (result.canceled || !result.filePath) return { ok: false, cancelado: true };
  try {
    fs.writeFileSync(result.filePath, conteudo || '', 'utf8');
    return { ok: true, caminho: result.filePath };
  } catch (err) {
    return { ok: false, erro: err.message };
  }
});

ipcMain.handle('dados:exportar-pdf', async (evt, nomeSugerido) => {
  const win = BrowserWindow.fromWebContents(evt.sender);
  const result = await dialog.showSaveDialog(win, {
    title: 'Exportar PDF',
    defaultPath: nomeSugerido || ('meubolso-relatorio-' + new Date().toISOString().slice(0, 10) + '.pdf'),
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (result.canceled || !result.filePath) return { ok: false, cancelado: true };
  try {
    const pdf = await win.webContents.printToPdf({ printBackground: true, pageSize: 'A4' });
    fs.writeFileSync(result.filePath, pdf);
    return { ok: true, caminho: result.filePath };
  } catch (err) {
    return { ok: false, erro: err.message };
  }
});

// S5-3: notificação nativa de vencimento (main process cria a Notification).
ipcMain.handle('notificar:vencimento', async (evt, item) => {
  try {
    const { Notification } = require('electron');
    if (!Notification.isSupported()) return { ok: false, suportado: false };
    const dataV = typeof item.vencimento === 'string' ? item.vencimento : String(item.vencimento || '');
    const titulo = 'MeuBolso — vencimento em breve';
    const corpo = `${item.descricao}${item.credor ? ' · ' + item.credor : ''}\nParcela ${item.parcela} vence em ${dataV}`;
    const n = new Notification({ title: titulo, body: corpo });
    n.show();
    return { ok: true };
  } catch (err) {
    return { ok: false, erro: err.message };
  }
});

ipcMain.handle('anexo:selecionar', async (evt) => {
  const win = BrowserWindow.fromWebContents(evt.sender);
  const result = await dialog.showOpenDialog(win, {
    title: 'Anexar comprovante',
    properties: ['openFile'],
    filters: [
      { name: 'Imagens', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] },
      { name: 'PDF', extensions: ['pdf'] },
      { name: 'Todos', extensions: ['*'] }
    ]
  });
  if (result.canceled || !result.filePaths || !result.filePaths.length) return { ok: false, cancelado: true };
  return { ok: true, caminho: result.filePaths[0] };
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