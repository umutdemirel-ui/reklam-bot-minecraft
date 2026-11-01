const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('prometheusDesktop', {
  capabilities: () => ipcRenderer.invoke('prometheus:capabilities'),
  execute: (action, input) => ipcRenderer.invoke('prometheus:execute', action, input),
});
