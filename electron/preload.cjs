const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("saldo", {
  load: () => ipcRenderer.invoke("saldo:load"),
  save: (data) => ipcRenderer.invoke("saldo:save", data),
});
