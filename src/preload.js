const { contextBridge, ipcRenderer } = require('electron');

let sharedData = {
  finalSelectedTable: null
};

contextBridge.exposeInMainWorld('electronAPI', {
  sendExcelFiles: (sourceBuffer, targetBuffer) => {
    ipcRenderer.send('save-excel-files', { 
      source: sourceBuffer, 
      target: targetBuffer 
    });
  },
  getBothExcelFiles: () => ipcRenderer.invoke('get-excel-files'),

   setFinalSelectedTable: (table) => {
    return ipcRenderer.invoke('set-final-selected-table', table);
  },
  getFinalSelectedTable: () => {
    return ipcRenderer.invoke('get-final-selected-table');
  }
});