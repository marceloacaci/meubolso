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
  try { return JSON.parse(JSON.stringify(data)); } catch (_) { return data; }
}

contextBridge.exposeInMainWorld('api', {
  carregar: () => ipcRenderer.invoke('dados:carregar'),
  // salvar() agora salva IMEDIATAMENTE (sem debounce) — chama salvarAgora internamente
  salvar: (data) => ipcRenderer.invoke('dados:salvar-agora', paraPlano(data)),
  salvarAgora: (data) => ipcRenderer.invoke('dados:salvar-agora', paraPlano(data)),
  caminho: () => ipcRenderer.invoke('dados:caminho'),
  sistemaInfo: () => ipcRenderer.invoke('sistema:info'),
  exportar: () => ipcRenderer.invoke('dados:exportar'),
  importar: () => ipcRenderer.invoke('dados:importar'),
  restaurar: () => ipcRenderer.invoke('dados:restaurar'),
  fazerBackup: () => ipcRenderer.invoke('dados:fazer-backup'),
  backupInfo: () => ipcRenderer.invoke('dados:backup-info'),
  listarBackups: () => ipcRenderer.invoke('dados:listar-backups'),
  restaurarBackup: (arquivo) => ipcRenderer.invoke('dados:restaurar-backup', arquivo),
  flashFoco: () => ipcRenderer.invoke('janela:flash-foco'),
  abrirLink: (url) => ipcRenderer.invoke('link:abrir', url)
});