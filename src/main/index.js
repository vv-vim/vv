import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { statSync, existsSync } from 'fs';
import path from 'path';

import menu, { refreshMenu } from './menu';
import installCli from './installCli';
import checkNeovim from './checkNeovim';

// import log from '../lib/log';

const windows = [];
let currentWindow;
let shouldQuit = false;

const isDev = (dev = true, notDev = false) =>
  process.env.NODE_ENV === 'development' ? dev : notDev;

const cliArgs = args => (args || process.argv).slice(isDev(2, 1));

const openDeveloperTools = win => {
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

const emptyWindows = [];

const createEmptyWindow = () => {
  const options = {
    width: 800,
    height: 600,
    show: false,
    fullscreenable: false,
  };
  let noResize = false;
  if (currentWindow && !currentWindow.isFullScreen() && !currentWindow.isSimpleFullScreen()) {
    const [x, y] = currentWindow.getPosition();
    options.x = x + 20;
    options.y = y; // + 20;
    [options.width, options.height] = currentWindow.getSize();
    noResize = true;
  }
  let win = new BrowserWindow(options);
  win.zoomLevel = 0;
  win.noResize = noResize;

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
    refreshMenu(currentWindow);
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

const doCreateWindow = (args = [], cwd) => {
  const win = getEmptyWindow();

  const initNvim = () => {
    win.webContents.send('initNvim', {
      args,
      cwd,
      resourcesPath: path.join(app.getAppPath(), isDev('./', '../')),
    });
    setTimeout(() => emptyWindows.push(createEmptyWindow()), 1000);
  };

  if (win.webContents.isLoading()) {
    win.webContents.on('did-finish-load', initNvim);
  } else {
    initNvim();
  }

  win.focus();

  windows.push(win);

  if (isDev()) openDeveloperTools(win);

  return win;
};

// Find files in args and create window with each file.
// If file is a directory, create window in context of this directory.
const createWindow = (args = [], newCwd) => {
  const cwd = newCwd || process.cwd();
  const fileArgs = ['--cmd', '-c', '-i', '-r', '-s', '-S', '-u', '-w', '-W', '--startuptime'];
  let fileNames = [];
  const filesSeparator = args.indexOf('--');
  if (filesSeparator !== -1) {
    fileNames = args.splice(filesSeparator).splice(1);
  } else {
    for (let i = args.length - 1; i >= 0; i -= 1) {
      if (['-', '+'].includes(args[i][0]) || (args[i - 1] && fileArgs.includes(args[i - 1]))) {
        break;
      }
      fileNames.push(args.pop());
    }
  }
  if (fileNames.length > 0) {
    for (let i = 0; i < fileNames.length; i += 1) {
      app.addRecentDocument(fileNames[i]);
      if (existsSync(fileNames[i]) && statSync(fileNames[i]).isDirectory()) {
        doCreateWindow(args, fileNames[i]);
      } else {
        doCreateWindow([...args, '--', fileNames[i]], cwd);
      }
    }
  } else {
    app.addRecentDocument(cwd);
    doCreateWindow(args, cwd);
  }
};

const openFile = () => {
  dialog.showOpenDialog(
    {
      properties: ['openFile', 'openDirectory', 'createDirectory', 'multiSelections'],
    },
    filePaths => {
      for (let i = 0; i < filePaths.length; i += 1) {
        createWindow([filePaths[i]]);
      }
    },
  );
};

const closeWindow = () => {
  if (currentWindow) {
    currentWindow.webContents.send('closeWindow');
  }
};

app.on('will-finish-launching', () => {
  app.on('open-file', (_e, windowPath) => {
    createWindow([windowPath]);
  });
});

ipcMain.on('cancel-quit', () => {
  shouldQuit = false;
});

app.on('ready', () => {
  checkNeovim();
  createWindow(cliArgs());
  menu({
    createWindow,
    openFile,
    installCli: installCli(path.join(app.getAppPath(), '../bin/vv')),
    closeWindow,
  });
});

app.on('before-quit', e => {
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
