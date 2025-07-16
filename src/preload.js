const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendExcelFile: (buffer) => ipcRenderer.send('save-excel-buffer', buffer),
  getExcelFile: () => ipcRenderer.invoke('get-excel-buffer')
});
