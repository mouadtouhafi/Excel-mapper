const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendExcelFiles: (sourceBuffer, targetBuffer) => {
    ipcRenderer.send('save-excel-files', { 
      source: sourceBuffer, 
      target: targetBuffer 
    });
  },
  getBothExcelFiles: () => ipcRenderer.invoke('get-excel-files')
});