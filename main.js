/*
  This part imports Electron modules (app, BrowserWindow, ipcMain) and Node.js modules (path and fs with promises). 
  It declares global variables for managing the main and child windows, Excel buffers, and data objects for 
  storing selected tables. 
  Finally, it defines the path for a JSON file (saved_codes.json) in the app’s user data folder to persist codes.
*/

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainwWindow, helloWindow
let excelBuffer = null;

let appData = {
  finalSelectedTable: null
};

let appDataTarget = {
  finalSelectedTableData: null
};

/* Define the file path for saved codes */
const SAVED_CODES_FILE = path.join(app.getPath('userData'), 'saved_codes.json');


function createWindow() {
  mainwWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, './src/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false,
  });

  helloWindow = new BrowserWindow({
    width: 300,
    height: 200,
    parent: mainwWindow
  });

  mainwWindow.loadFile('./src/html/main-page.html');
  mainwWindow.once("ready-to-show", mainwWindow.show)

  /*Here when the windows are close, all the parameters related will be deleted from RAM (garbage collector)*/
  mainwWindow.on('closed', () => {
    mainwWindow = null
  })
  helloWindow.on('closed', () => {
    helloWindow = null
  })
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
})

let excelBuffers = { source: null, target: null };
ipcMain.on('save-excel-files', (event, payload) => {
  excelBuffers.source = payload.source;
  excelBuffers.target = payload.target;
  console.log('Excel files saved:', {
    sourceSize: payload.source ? payload.source.length : 0,
    targetSize: payload.target ? payload.target.length : 0
  });
});

ipcMain.handle('get-excel-files', () => {
  return excelBuffers;
});

/* For the source file data table*/
ipcMain.handle('set-final-selected-table', (event, table) => {
  appData.finalSelectedTable = table;
  return true;
});

ipcMain.handle('get-final-selected-table', (event) => {
  return appData.finalSelectedTable;
});

/* For the target file data table*/
ipcMain.handle('set-final-selected-table-data', (event, table) => {
  appDataTarget.finalSelectedTableData = table;
  return true;
});

ipcMain.handle('get-final-selected-table-data', (event) => {
  return appDataTarget.finalSelectedTableData;
});

/* Method to save code to file */
ipcMain.handle('saveCodeToFile', async (event, codeData) => {
  try {
    let existingCodes = [];

    /* Check if file exists and read existing codes */
    try {
      const fileContent = await fs.readFile(SAVED_CODES_FILE, 'utf8');
      existingCodes = JSON.parse(fileContent);
    } catch (error) {
      /* File doesn't exist or is invalid, start with empty array */
      console.log('Creating new saved codes file');
    }

    /* Add the new code data */
    existingCodes.push(codeData);

    /* Write back to file */
    await fs.writeFile(SAVED_CODES_FILE, JSON.stringify(existingCodes, null, 2));
    return {
      success: true,
      filePath: SAVED_CODES_FILE,
      totalSaved: existingCodes.length
    };
  } catch (error) {
    console.error('Error saving code to file:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

/* Method to save new Excel file */
ipcMain.handle('save-new-excel-file', async (event, buffer) => {
  try {
    const { dialog } = require('electron');

    const { filePath } = await dialog.showSaveDialog(mainwWindow, {
      title: 'Save New Excel File',
      defaultPath: 'output-mapping.xlsx',
      filters: [
        { name: 'Excel Files', extensions: ['xlsx'] }
      ]
    });

    if (filePath) {
      await fs.writeFile(filePath, Buffer.from(buffer));
      return { success: true, filePath };
    }

    return { success: false, reason: 'Save cancelled' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/* NEW: Method to load saved codes */
ipcMain.handle('loadSavedCodes', async (event) => {
  try {
    const fileContent = await fs.readFile(SAVED_CODES_FILE, 'utf8');
    const codes = JSON.parse(fileContent);
    return codes;
  } catch (error) {
    console.error('Error loading saved codes:', error);
    return [];
  }
});

/* Method to clear all saved codes */
ipcMain.handle('clearAllSavedCodes', async (event) => {
  try {
    await fs.writeFile(SAVED_CODES_FILE, JSON.stringify([], null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error clearing saved codes:', error);
    return { success: false, error: error.message };
  }
});