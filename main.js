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

/*
  This function builds one window: the main app window (mainwWindow, 800×600). 
  The preload.js file is loaded for secure communication, with contextIsolation: true and nodeIntegration: false 
  for security. 
  The main page HTML is loaded into mainwWindow and only shown when ready. 
  When windows are closed, their references are set to null to free memory for garbage collection.
*/
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

  mainwWindow.loadFile('./src/html/main-page.html');
  mainwWindow.once("ready-to-show", mainwWindow.show)

  /*Here when the windows are close, all the parameters related will be deleted from RAM (garbage collector)*/
  mainwWindow.on('closed', () => {
    mainwWindow = null
  })
}


/*
 Here, the app creates windows only after Electron is fully initialized (whenReady). 
 On non-macOS platforms, closing all windows quits the app. 
 On macOS, apps usually stay open until explicitly quit, so the condition handles that. 
 The before-quit event is defined for cleanup logic, but is currently empty. 
*/
app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
})


/* 
  This section sets up in-memory storage for Excel files. 
  When the renderer sends data with save-excel-files, the buffers are saved in excelBuffers 
  and their sizes logged. 
  The get-excel-files handler lets the renderer retrieve these buffers later. 
  This avoids writing temporary files to disk unless explicitly requested.
*/
let excelBuffers = { source: null, target: null };
ipcMain.on('save-excel-files', (event, payload) => {
  excelBuffers.source = payload.source;
  excelBuffers.target = payload.target;
  console.log('Excel files saved:', {
    sourceSize: payload.source ? payload.source.length : 0,
    targetSize: payload.target ? payload.target.length : 0
  });
});


/*
  This block manages user-selected table data. 
  The handlers allow the renderer to set and get a final selected table for both source and target files. 
  The data is stored in memory (appData and appDataTarget) and is accessible throughout the app without 
  saving it to disk.
*/
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



/*
  This method saves code snippets persistently in a JSON file. 
  It tries to read the existing file and parse it into an array. 
  If the file doesn’t exist, it initializes an empty one. The new codeData is pushed into the array, 
  then written back to disk with indentation for readability. 
  The handler returns metadata about the save operation, including how many codes are now stored.  
*/
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

/* 
  This handler lets the user save a processed Excel buffer as a new .xlsx file. 
  It uses dialog.showSaveDialog to open a "Save As" prompt. If the user selects a location, 
  it writes the buffer to disk; otherwise, it reports that saving was canceled. 
  Errors (e.g., permission issues) are caught and returned.
*/
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

/* 
  This part manages the persistence of saved codes. 
  loadSavedCodes reads the JSON file and returns the array of codes, or an empty array if the file 
  doesn’t exist or fails to parse. 
  clearAllSavedCodes resets the file by overwriting it with an empty array, 
  effectively deleting all stored codes. 
  These functions let the renderer reload old codes or reset storage completely.
*/
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
ipcMain.handle('clearAllSavedCodes', async (event) => {
  try {
    await fs.writeFile(SAVED_CODES_FILE, JSON.stringify([], null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error clearing saved codes:', error);
    return { success: false, error: error.message };
  }
});