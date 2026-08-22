const { contextBridge, ipcRenderer } = require('electron');

// O `estado` do app é um Proxy reativo do Vue (Vue.reactive). O algoritmo de
// serialização de valores do Electron (clone estruturado, usado por
// ipcRenderer.invoke) NÃO consegue clonar um Proxy — lançaria
// "An object could not be cloned." e o salvamento falharia silenciosamente
// (o catch de persistir() engole o erro e nada é gravado no disco).
// Por isso, antes de enviar pelo IPC, desserializamos o Proxy para um objeto
// plano via JSON. JSON.stringify funciona normalmente em Proxies reativos.
function paraPlano(data) {
  if (data === null || typeof data !== 'object') return data;
  try {
    return JSON.parse(JSON.stringify(data));
  } catch (_) {
    return data;
  }
}

contextBridge.exposeInMainWorld('api', {
  carregar: () => ipcRenderer.invoke('dados:carregar'),
  // salvarAgora(): grava IMEDIATAMENTE (sem debounce) o plano de dados.
  // Expõe um único nome (S8-C10: unificado; app.js usa este).
  salvarAgora: (data) => ipcRenderer.invoke('dados:salvar-agora', paraPlano(data)),
  caminho: () => ipcRenderer.invoke('dados:caminho'),
  sistemaInfo: () => ipcRenderer.invoke('sistema:info'),
  exportar: () => ipcRenderer.invoke('dados:exportar'),
  exportarCSV: (conteudo, nomeSugerido) =>
    ipcRenderer.invoke('dados:exportar-csv', conteudo, nomeSugerido),
  exportarPDF: (nomeSugerido) => ipcRenderer.invoke('dados:exportar-pdf', nomeSugerido),
  importar: () => ipcRenderer.invoke('dados:importar'),
  restaurar: () => ipcRenderer.invoke('dados:restaurar'),
  fazerBackup: () => ipcRenderer.invoke('dados:fazer-backup'),
  backupInfo: () => ipcRenderer.invoke('dados:backup-info'),
  listarBackups: () => ipcRenderer.invoke('dados:listar-backups'),
  restaurarBackup: (arquivo) => ipcRenderer.invoke('dados:restaurar-backup', arquivo),
  flashFoco: () => ipcRenderer.invoke('janela:flash-foco'),
  // Largura de abertura (modo janela) — referência da escala responsiva de
  // cards/fontes no renderer (ver --app-width-scale em styles.css/app.js).
  larguraBase: () => ipcRenderer.invoke('app:largura-base'),
  abrirLink: (url) => ipcRenderer.invoke('link:abrir', url),
  // Notificação nativa do sistema operacional (Windows Toast / macOS / Linux).
  notificarNativa: (payload) => ipcRenderer.invoke('notificar:nativa', payload),
  selecionarAnexo: () => ipcRenderer.invoke('anexo:selecionar'),
  criptoDesbloquear: (senha) => ipcRenderer.invoke('cripto:desbloquear', senha),
  criptoAtivar: (senha) => ipcRenderer.invoke('cripto:ativar', senha),
  criptoDesativar: () => ipcRenderer.invoke('cripto:desativar'),
  // S6-4: perfis de dados
  perfilListar: () => ipcRenderer.invoke('perfil:listar'),
  perfilCriar: (nome) => ipcRenderer.invoke('perfil:criar', nome),
  perfilDefinirAtivo: (id) => ipcRenderer.invoke('perfil:definirAtivo', id),
  perfilRenomear: (p) => ipcRenderer.invoke('perfil:renomear', p),
  perfilTrocarSenha: (p) => ipcRenderer.invoke('perfil:trocarSenha', p),
  perfilRemover: (id) => ipcRenderer.invoke('perfil:remover', id),
  // S10 — modo família (marca perfil compartilhado) e sync de pasta externa.
  perfilFamiliar: (id, ativa) => ipcRenderer.invoke('perfil:familiar', { id, ativa }),
  perfilSincronizarPasta: (destino) => ipcRenderer.invoke('perfil:sincronizar-pasta', destino),
  // S10 — diálogo do SO para escolher pasta de destino do sync.
  selecionarPasta: () => ipcRenderer.invoke('app:selecionar-pasta'),
  // ---- Atualização do sistema ----
  updateBaixar: () => ipcRenderer.invoke('update:baixar'),
  updateInstalarAgora: () => ipcRenderer.invoke('update:instalar-agora'),
  updateAdiar: () => ipcRenderer.invoke('update:adiar'),
  updateVerificarAgora: () => ipcRenderer.invoke('update:verificar-agora'),
  // Escuta eventos de progresso/status enviados pelo main (auto-updater).
  onUpdate: (canal, cb) => {
    const wrapper = (_e, payload) => cb(payload);
    ipcRenderer.on(canal, wrapper);
    return () => ipcRenderer.removeListener(canal, wrapper);
  },
});
