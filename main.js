const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainwWindow, helloWindow
let excelBuffer = null;

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

  mainwWindow.loadFile('./src/main-page.html');
//mainwWindow.loadFile('./src/mapping.html');
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

// IPC to store/retrieve Excel buffer
ipcMain.on('save-excel-buffer', (event, buffer) => {
  excelBuffer = buffer;
});

ipcMain.handle('get-excel-buffer', () => {
  return excelBuffer;
});
