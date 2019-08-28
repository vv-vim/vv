import { app, BrowserWindow, dialog } from 'electron';
import { statSync, existsSync } from 'fs';
import path from 'path';

import menu from './menu';
import installCli from './installCli';
import checkNeovim from './checkNeovim';

import { setShouldQuit } from './nvim/features/quit';

import isDev from '../lib/isDev';

import initNvim from './nvim/nvim.js';

// import log from '../lib/log';

const windows = [];
let currentWindow;

const cliArgs = args => (args || process.argv).slice(isDev(2, 1));

const openDeveloperTools = win => {
  win.webContents.openDevTools({ mode: 'detach' });
  win.webContents.on('devtools-opened', () => {
    win.webContents.focus();
  });
};

const handleAllClosed = () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
};

const emptyWindows = [];

const createEmptyWindow = () => {
  const options = {
    width: 800,
    height: 600,
    show: false,
    fullscreenable: false,
    webPreferences: {
      nodeIntegration: true,
    },
  };
  let win = new BrowserWindow(options);
  win.zoomLevel = 0;

  win.on('closed', async () => {
    if (currentWindow === win) currentWindow = null;

    const i = windows.indexOf(win);
    if (i !== -1) windows.splice(i, 1);
    win = null;

    if (windows.length === 0) handleAllClosed();
  });

  win.on('focus', () => {
    currentWindow = win;
  });

  win.loadURL(
    process.env.DEV_SERVER
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, './index.html')}`,
  );

  return win;
};

const getEmptyWindow = () => {
  if (emptyWindows.length > 0) {
    return emptyWindows.pop();
  }
  return createEmptyWindow();
};

const createWindow = (args = [], newCwd) => {
  const cwd = newCwd || process.cwd();
  const win = getEmptyWindow();

  if (currentWindow && !currentWindow.isFullScreen() && !currentWindow.isSimpleFullScreen()) {
    const [x, y] = currentWindow.getPosition();
    const [width, height] = currentWindow.getSize();
    win.setBounds({ x: x + 20, y: y + 20, width, height }, false);
  }

  initNvim({
    args,
    cwd,
    win,
  });

  if (win.webContents.isLoading()) {
    win.webContents.on('did-finish-load', () => win.webContents.send('initRenderer'));
  } else {
    win.webContents.send('initRenderer');
  }

  win.focus();
  windows.push(win);

  // if (isDev()) openDeveloperTools(win);

  setTimeout(() => emptyWindows.push(createEmptyWindow()), 1000);

  return win;
};

const openFileOrDir = fileName => {
  app.addRecentDocument(fileName);
  if (existsSync(fileName) && statSync(fileName).isDirectory()) {
    createWindow([fileName], fileName);
  } else {
    createWindow([fileName]);
  }
};

const openFile = () => {
  dialog.showOpenDialog(
    {
      properties: ['openFile', 'openDirectory', 'createDirectory', 'multiSelections'],
    },
    (fileNames = []) => fileNames.forEach(openFileOrDir),
  );
};

app.on('will-finish-launching', () => {
  app.on('open-file', (_e, file) => openFileOrDir(file));
});

app.on('ready', () => {
  checkNeovim();
  createWindow(cliArgs());
  menu({
    createWindow,
    openFile,
    installCli: installCli(path.join(app.getAppPath(), '../bin/vv')),
    // closeWindow,
  });
});

app.on('before-quit', e => {
  setShouldQuit(true);
  const visibleWindows = windows.filter(w => w.isVisible());
  if (visibleWindows.length > 0) {
    e.preventDefault();
    (currentWindow || visibleWindows[0]).close();
  }
});

app.on('window-all-closed', handleAllClosed);

app.on('activate', async () => {
  if (windows.length === 0) {
    createWindow();
  }
});

if (!isDev()) {
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    app.quit();
  } else {
    app.on('second-instance', (_e, args, cwd) => {
      createWindow(cliArgs(args), cwd);
    });
  }
}

