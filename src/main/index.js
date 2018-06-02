import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fixPath from 'fix-path';

import menu from './menu';

const windows = [];
let currentWindow;
let shouldQuit = false;

const isDev = (dev = true, notDev = false) =>
  (process.env.NODE_ENV === 'development' ? dev : notDev);

const cliArgs = args => (args || process.argv).slice(isDev(2, 1));

const openDeveloperTools = (win) => {
  win.webContents.openDevTools({ mode: 'detach' });
  win.webContents.on('devtools-opened', () => {
    win.webContents.focus();
  });
};

const handleAllClosed = () => {
  if (shouldQuit || process.platform !== 'darwin') {
    app.quit();
  }
};

const createWindow = (args = [], cwd) => {
  let win = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    fullscreenable: false,
  });

  fixPath();
  win.args = args;
  win.env = process.env;
  win.cwd = cwd;
  win.resourcesPath = path.join(app.getAppPath(), isDev('./', '../'));
  win.zoomLevel = 0;

  // win.maximize();
  win.show();

  win.loadURL(isDev(
    'http://localhost:3000',
    `file://${path.join(__dirname, './index.html')}`,
  ));

  win.on('closed', async () => {
    if (currentWindow === win) currentWindow = null;

    const i = windows.indexOf(win);
    if (i !== -1) windows.splice(i, 1);
    win = null;

    if (shouldQuit) app.quit();
    if (windows.length === 0) handleAllClosed();
  });

  win.on('focus', () => {
    currentWindow = win;
  });

  if (isDev()) openDeveloperTools(win);

  win.focus();

  windows.push(win);

  return win;
};

ipcMain.on('cancel-quit', () => {
  shouldQuit = false;
});

app.on('ready', () => {
  createWindow(cliArgs());
  menu({ createWindow });
});

app.on('before-quit', (e) => {
  if (windows.length > 0) {
    e.preventDefault();
    shouldQuit = true;
    (currentWindow || windows[0]).webContents.send('quit');
  }
});

app.on('window-all-closed', handleAllClosed);

app.on('activate', async () => {
  if (windows.length === 0) {
    createWindow();
  }
});

if (!isDev()) {
  const doQuit = app.makeSingleInstance((args, cwd) => {
    createWindow(cliArgs(args), cwd);
  });

  if (doQuit) {
    app.quit();
  }
}
