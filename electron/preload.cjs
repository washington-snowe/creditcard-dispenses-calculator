const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("saldo", {
  load: () => ipcRenderer.invoke("saldo:load"),
  save: (data) => ipcRenderer.invoke("saldo:save", data),
  ready: () => ipcRenderer.invoke("saldo:update:ready"),
  updateInfo: () => ipcRenderer.invoke("saldo:update:info"),
  openReleases: () => ipcRenderer.invoke("saldo:update:releases"),
  checkUpdates: () => ipcRenderer.invoke("saldo:update:check"),
  downloadUpdate: () => ipcRenderer.invoke("saldo:update:download"),
  cancelUpdate: () => ipcRenderer.invoke("saldo:update:cancel"),
  applyUpdate: () => ipcRenderer.invoke("saldo:update:apply"),
  onUpdateProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on("saldo:update:progress", listener);
    return () => ipcRenderer.removeListener("saldo:update:progress", listener);
  },
});
