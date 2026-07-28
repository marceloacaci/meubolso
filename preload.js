const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  carregar: () => ipcRenderer.invoke('dados:carregar'),
  salvar: (data) => ipcRenderer.invoke('dados:salvar', data),
  caminho: () => ipcRenderer.invoke('dados:caminho'),
  sistemaInfo: () => ipcRenderer.invoke('sistema:info'),
  exportar: () => ipcRenderer.invoke('dados:exportar'),
  importar: () => ipcRenderer.invoke('dados:importar'),
  restaurar: () => ipcRenderer.invoke('dados:restaurar'),
  backupInfo: () => ipcRenderer.invoke('dados:backup-info'),
  flashFoco: () => ipcRenderer.invoke('janela:flash-foco'),
  // Abre um link externo (http/https) no navegador padrão do sistema.
  abrirLink: (url) => ipcRenderer.invoke('link:abrir', url)
});
