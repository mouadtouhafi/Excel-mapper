const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainwWindow, helloWindow
let excelBuffer = null;

let appData = {
  finalSelectedTable: null
};

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
  helloWindow.loadFile('./src/hello-page.html');
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
  // payload: { source: Buffer, target: Buffer }
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

ipcMain.handle('set-final-selected-table', (event, table) => {
  appData.finalSelectedTable = table;
  return true;
});

ipcMain.handle('get-final-selected-table', (event) => {
  return appData.finalSelectedTable;
});