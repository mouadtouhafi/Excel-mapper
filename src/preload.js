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

  /*
    This function retrieves Excel files from the main process using ipcRenderer.invoke.
    - Unlike .send, invoke returns a promise, so you can await it in the renderer.
    - 'get-excel-files' is the channel name; the main process must handle it and return the Excel data.
  */
  getBothExcelFiles: () => ipcRenderer.invoke('get-excel-files'),

  /*
    These two functions manage the selected table from the source Excel file.
    - setFinalSelectedTable(table) sends the selected table to the main process.
    - getFinalSelectedTable() retrieves it back from the main process.
    This ensures that data can persist even if the renderer reloads, and keeps the main process in sync with the UI.
  */
  /* For the source file data table*/
  setFinalSelectedTable: (table) => {
    return ipcRenderer.invoke('set-final-selected-table', table);
  },
  getFinalSelectedTable: () => {
    return ipcRenderer.invoke('get-final-selected-table');
  },


  /*
    These are similar to the source table functions but for the target Excel file. 
    We can store and retrieve the selected target table in the main process.
  */
  /* For the target file data table*/
  setFinalSelectedTableData: (table) => {
    return ipcRenderer.invoke('set-final-selected-table-data', table);
  },
  getFinalSelectedTableData: () => {
    return ipcRenderer.invoke('get-final-selected-table-data');
  },

  /* 
    These three functions handle saving, loading, and clearing code snippets in your application:
    - saveCodeToFile(codeData): Sends code data to the main process to be saved on disk.
    - loadSavedCodes(): Retrieves previously saved code snippets.
    - clearAllSavedCodes(): Deletes all saved codes.
    All of them use invoke because they expect a response from the main process.
  */
  saveCodeToFile: (codeData) => ipcRenderer.invoke('saveCodeToFile', codeData),
  loadSavedCodes: () => ipcRenderer.invoke('loadSavedCodes'),
  clearAllSavedCodes: () => ipcRenderer.invoke('clearAllSavedCodes'),

  /* 
    This function allows the renderer to send a modified Excel file buffer to the main process 
    to be saved as a new file.
    buffer contains the Excel data.
    Using invoke ensures that the renderer can know when the save is complete or if it fails.
  */
  saveNewExcelFile: (buffer) => ipcRenderer.invoke('save-new-excel-file', buffer)
});