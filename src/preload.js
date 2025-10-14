/*
  Here, we are importing two important modules from Electron:
  - contextBridge: This module allows you to safely expose APIs from the main process to the renderer process 
    (the web page). 
  It prevents direct access to Node.js APIs from untrusted web content, which improves security.
  - ipcRenderer: This is the renderer process side of Electron’s inter-process communication (IPC). 
    It allows your frontend JavaScript to send and receive messages from the main process.
*/
const { contextBridge, ipcRenderer } = require('electron');

/*
  These are simple JavaScript objects used to temporarily store data in the renderer process.
  - sharedData is intended to store the selected table from the source Excel file.
  - sharedDataTarget is intended to store the selected table from the target Excel file.
  Initially, both are set to null because no table is selected yet.
*/
let sharedData = {
  finalSelectedTable: null
};

let sharedDataTarget = {
  finalSelectedTableData: null
};

/*
  This line uses contextBridge to expose a custom object electronAPI in the renderer’s window object. 
  This allows your frontend code (HTML/JS) to safely call backend functions without directly 
  using Node.js modules. 
  Everything inside this object (sendExcelFiles, getBothExcelFiles, etc.) becomes available in the 
  renderer as window.electronAPI.
*/
contextBridge.exposeInMainWorld('electronAPI', {

  /*
    This is a function that allows the frontend to send two Excel files (source and target) to the main process.
    - sourceBuffer and targetBuffer are likely the raw data of Excel files.
    - ipcRenderer.send sends a fire-and-forget message to the main process with the channel 
      'save-excel-files' and an object containing both files.
    This is useful for saving the files or processing them in the backend.
  */
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

  /* Methods for saving/loading codes */
  saveCodeToFile: (codeData) => ipcRenderer.invoke('saveCodeToFile', codeData),
  loadSavedCodes: () => ipcRenderer.invoke('loadSavedCodes'),
  clearAllSavedCodes: () => ipcRenderer.invoke('clearAllSavedCodes'),

  /* Method for saving new modified Excel file */
  saveNewExcelFile: (buffer) => ipcRenderer.invoke('save-new-excel-file', buffer)
});