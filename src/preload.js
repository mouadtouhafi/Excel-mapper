const { contextBridge, ipcRenderer } = require('electron');

let sharedData = {
  finalSelectedTable: null
};

let sharedDataTarget = {
  finalSelectedTableData: null
};

contextBridge.exposeInMainWorld('electronAPI', {
  sendExcelFiles: (sourceBuffer, targetBuffer) => {
    ipcRenderer.send('save-excel-files', {
      source: sourceBuffer,
      target: targetBuffer
    });
  },
  getBothExcelFiles: () => ipcRenderer.invoke('get-excel-files'),

  /* For the source file data table*/
  setFinalSelectedTable: (table) => {
    return ipcRenderer.invoke('set-final-selected-table', table);
  },
  getFinalSelectedTable: () => {
    return ipcRenderer.invoke('get-final-selected-table');
  },

  /* For the target file data table*/
  setFinalSelectedTableData: (table) => {
    return ipcRenderer.invoke('set-final-selected-table-data', table);
  },
  getFinalSelectedTableData: () => {
    return ipcRenderer.invoke('get-final-selected-table-data');
  },

  // NEW: Method for saving codes
  saveCodeToFile: (codeData) => ipcRenderer.invoke('saveCodeToFile', codeData)
});