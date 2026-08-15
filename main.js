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
let mainWin = null;
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
  mainWin = win;

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
  // O portátil usa fluxo próprio (troca de .exe via .bat); o instalado usa
  // o electron-updater (NSIS).
  if (ambienteAtual === 'portatil') {
    iniciarAutoUpdatePortatil();
    return;
  }
  try {
    const { autoUpdater } = require('electron-updater');
    // Não baixa automaticamente: o usuário decide na tela "Atualização disponível".
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    // Verifica periodicamente (a cada 3h) além do startup.
    let verificando = false;
    const verificar = () => {
      if (verificando) return;
      verificando = true;
      autoUpdater.checkForUpdates().catch((err) => {
        console.warn('Verificação de atualização falhou:', err.message);
      }).finally(() => { verificando = false; });
    };
    autoUpdater.on('update-available', (info) => {
      const file = (info.files && info.files[0]) || {};
      const sizeBytes = file.size || info.updateInfo && info.updateInfo.size || 0;
      enviarUpdate('update:disponivel', {
        version: info.version || info.updateInfo && info.updateInfo.version,
        releaseNotes: info.releaseNotes || '',
        releaseDate: info.releaseDate || '',
        sizeBytes: Number(sizeBytes) || 0,
      });
    });
    autoUpdater.on('download-progress', (p) => {
      enviarUpdate('update:progresso', {
        percent: Math.round(p.percent || 0),
        transferred: p.transferred || 0,
        total: p.total || 0,
      });
    });
    autoUpdater.on('update-downloaded', () => {
      enviarUpdate('update:baixado', {});
    });
    autoUpdater.on('error', (err) => {
      enviarUpdate('update:erro', { message: err && err.message ? err.message : String(err) });
    });

    ipcMain.handle('update:baixar', async () => { try { return await autoUpdater.downloadUpdate(); } catch (e) { return { erro: e.message }; } });
    ipcMain.handle('update:instalar-agora', async () => { try { autoUpdater.quitAndInstall(false, true); return { ok: true }; } catch (e) { return { erro: e.message }; } });
    ipcMain.handle('update:adiar', async () => { return { ok: true }; });
    ipcMain.handle('update:verificar-agora', async () => { verificar(); return { ok: true }; });

    // Verifica ao iniciar (pequeno atraso para a janela estar pronta).
    setTimeout(verificar, 4000);
    setInterval(verificar, 3 * 60 * 60 * 1000);
  } catch (err) {
    console.warn('Auto-update indisponível:', err.message);
  }
}

// Envia evento de atualização para a janela principal (se houver e estiver pronta).
function enviarUpdate(canal, payload) {
  if (mainWin && !mainWin.isDestroyed() && mainWin.webContents) {
    mainWin.webContents.send(canal, payload);
  }
}

// ---- Auto-update para o PORTÁTIL ----
// O electron-updater (NSIS) não troca o .exe portátil em execução. Implementamos
// um fluxo próprio: busca a última release no GitHub, baixa o asset *-portable.exe
// e, ao reiniciar, um .bat auxiliar troca o executável e relança.
const https = require('https');
const { execFile } = require('child_process');

function iniciarAutoUpdatePortatil() {
  // Handler: verifica a última release e emite "update:disponivel" se houver nova versão.
  ipcMain.handle('update:verificar-agora', async () => {
    try {
      const rel = await buscarUltimaRelease();
      if (!rel) return { ok: true, disponivel: false };
      const cmp = compararVersoes(rel.tag, app.getVersion());
      if (cmp <= 0) return { ok: true, disponivel: false };
      const asset = (rel.assets || []).find(a => /portable\.exe$/i.test(a.name));
      if (!asset) return { ok: true, disponivel: false };
      enviarUpdate('update:disponivel', {
        version: rel.tag,
        releaseNotes: rel.notes || '',
        releaseDate: rel.published || '',
        sizeBytes: Number(asset.size) || 0,
        portable: true,
        downloadUrl: asset.browser_download_url,
      });
      return { ok: true, disponivel: true };
    } catch (e) {
      enviarUpdate('update:erro', { message: e.message });
      return { ok: false, erro: e.message };
    }
  });

  // Handler: baixa o asset portátil para a pasta _update/ e reporta progresso.
  ipcMain.handle('update:baixar', async (_e, url) => {
    try {
      const target = typeof url === 'string' ? url : null;
      if (!target) return { erro: 'sem url de download' };
      const portaDir = process.env.PORTABLE_EXECUTABLE_DIR;
      if (!portaDir) return { erro: 'ambiente nao portatil' };
      const tmpDir = path.join(portaDir, '_update');
      fs.mkdirSync(tmpDir, { recursive: true });
      const dest = path.join(tmpDir, 'MeuBolso-portable-novo.exe');
      await baixarArquivo(target, dest, (p) => enviarUpdate('update:progresso', p));
      enviarUpdate('update:baixado', {});
      return { ok: true };
    } catch (e) {
      enviarUpdate('update:erro', { message: e.message });
      return { erro: e.message };
    }
  });

  // Handler: aplica a troca (escreve .bat que troca o exe e relança) e fecha.
  ipcMain.handle('update:instalar-agora', async () => {
    try {
      const portaDir = process.env.PORTABLE_EXECUTABLE_DIR;
      if (!portaDir) return { erro: 'ambiente nao portatil' };
      const atual = process.execPath;
      const novo = path.join(portaDir, '_update', 'MeuBolso-portable-novo.exe');
      if (!fs.existsSync(novo)) return { erro: 'arquivo nao baixado' };
      const bat = path.join(portaDir, '_update', 'aplicar-update.bat');
      const conteudo =
        '@echo off\r\n' +
        'timeout /t 1 /nobreak >nul\r\n' +
        `move /Y "${novo}" "${atual}"\r\n` +
        `start "" "${atual}"\r\n` +
        `del "%~f0"\r\n`;
      fs.writeFileSync(bat, conteudo);
      // Dispara o .bat (detached) e encerra o app; o .bat assume a troca.
      execFile('cmd.exe', ['/c', bat], { detached: true, stdio: 'ignore', windowsHide: true });
      setTimeout(() => app.quit(), 300);
      return { ok: true };
    } catch (e) {
      return { erro: e.message };
    }
  });

  ipcMain.handle('update:adiar', async () => ({ ok: true }));

  // Verifica ao iniciar (a cada 6h).
  setTimeout(() => ipcMain.emit('update:verificar-agora'), 4000);
  setInterval(() => ipcMain.emit('update:verificar-agora'), 6 * 60 * 60 * 1000);
}

// Busca a última release via GitHub API (sem token: rate limit 60/h, suficiente).
function buscarUltimaRelease() {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path: '/repos/marceloacaci/meubolso/releases/latest',
      headers: { 'User-Agent': 'MeuBolso', 'Accept': 'application/vnd.github+json' },
    };
    https.get(opts, (res) => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('GitHub API ' + res.statusCode)); }
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          const j = JSON.parse(body);
          resolve({
            tag: String(j.tag_name || '').replace(/^v/, ''),
            notes: j.body || '',
            published: j.published_at || '',
            assets: (j.assets || []).map(a => ({ name: a.name, size: a.size, browser_download_url: a.browser_download_url })),
          });
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// Baixa um arquivo via https com callback de progresso {percent, transferred, total}.
function baixarArquivo(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    const f = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        f.close(); fs.unlinkSync(dest);
        return baixarArquivo(res.headers.location, dest, onProgress).then(resolve, reject);
      }
      if (res.statusCode !== 200) { f.close(); fs.unlinkSync(dest); return reject(new Error('HTTP ' + res.statusCode)); }
      const total = Number(res.headers['content-length']) || 0;
      let transferred = 0;
      res.on('data', (chunk) => {
        transferred += chunk.length;
        if (total) onProgress({ percent: (transferred / total) * 100, transferred, total });
      });
      res.pipe(f);
      f.on('finish', () => f.close(() => resolve(dest)));
      f.on('error', (e) => { f.close(); fs.unlinkSync(dest); reject(e); });
    }).on('error', (e) => { f.close(); fs.unlinkSync(dest); reject(e); });
  });
}

// Compara versões semânticas simples (retorna >0 se a > b).
function compararVersoes(a, b) {
  const pa = String(a || '').split(/[-+]/)[0].split('.').map(Number);
  const pb = String(b || '').split(/[-+]/)[0].split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x !== y) return x - y;
  }
  return 0;
}

// Migra dados do usuário ao atualizar o app (ambiente instalado).
// Os dados ficam em %APPDATA%/meubolso/<versao>/. Ao abrir uma versão nova,
// copiamos os dados da versão anterior para a atual (nunca apagamos a origem
// antes de confirmar a cópia) e removemos pastas de versões obsoletas.
// opts (opcional, para testes): { base, versaoAtual, ambiente }
function migrarDadosInstalado(opts = {}) {
  const ambiente = opts.ambiente !== undefined ? opts.ambiente : ambienteAtual;
  if (ambiente !== 'instalado') return { copiado: false, limpar: [] };
  const base = opts.base !== undefined ? opts.base : app.getPath('userData');
  const versaoAtual = opts.versaoAtual !== undefined ? opts.versaoAtual : (app.getVersion() || '0.0.0');
  const { executarMigracaoFS } = require('./src/caminhos-dados');
  try {
    const r = executarMigracaoFS({ base, versaoAtual, fs, path });
    if (r.copiado) console.log('[MIGRAÇÃO] Dados copiados de', r.origem, '->', versaoAtual, '; removidas:', r.removidos.join(', '));
    return r;
  } catch (err) {
    console.warn('[MIGRAÇÃO] Ignorada (não crítica):', err.message);
    return { copiado: false, origem: null, removidos: [] };
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
  migrarDadosInstalado();
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

// Exporta funções internas para testes (não afeta o runtime do Electron, que
// não consome module.exports do entry-point).
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { migrarDadosInstalado, planejarMigracao: require('./src/caminhos-dados').planejarMigracao };
}