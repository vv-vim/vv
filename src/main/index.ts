import { app, BrowserWindow, dialog } from 'electron';
import { statSync, existsSync } from 'fs';
import { join /* , resolve */ } from 'path';

import menu from './menu';
import installCli from './installCli';
import checkNeovim from './checkNeovim';

import { setShouldQuit } from './nvim/features/quit';
import { getSettings } from './nvim/settings';

import initAutoUpdate from './autoUpdate';

import isDev from '../lib/isDev';

import initNvim from './nvim/nvim';
// import { argsFileNames } from './lib/args';

// import log from '../lib/log';

let currentWindow: BrowserWindow | undefined | null;

const windows: BrowserWindow[] = [];

/** Empty windows created in advance to make windows creation faster */
const emptyWindows: BrowserWindow[] = [];

const filterArgs = (args: string[]) => args.filter(a => !['--inspect'].includes(a));

const cliArgs = (args?: string[]) => (args || process.argv).slice(isDev(2, 1));

const openDeveloperTools = (win: BrowserWindow) => {
  win.webContents.openDevTools({ mode: 'detach' });
  win.webContents.on('devtools-opened', () => {
    win.webContents.focus();
  });
};

const handleAllClosed = () => {
  const { quitoncloselastwindow } = getSettings();
  if (quitoncloselastwindow || process.platform !== 'darwin') {
    app.quit();
  }
};

const createEmptyWindow = () => {
  const options = {
    width: 800,
    height: 600,
    show: false,
    fullscreenable: false,
    webPreferences: {
      preload: join(app.getAppPath(), isDev('./', '../'), 'src/main/preload.js'),
    },
  };
  let win = new BrowserWindow(options);
  // @ts-ignore TODO
  win.zoomLevel = 0;

  win.on('closed', async () => {
    if (currentWindow === win) currentWindow = null;

    const i = windows.indexOf(win);
    if (i !== -1) windows.splice(i, 1);
    // @ts-ignore TODO
    win = null;

    if (windows.length === 0) handleAllClosed();
  });

  win.on('focus', () => {
    currentWindow = win;
  });

  win.loadURL(
    process.env.DEV_SERVER ? 'http://localhost:3000' : `file://${join(__dirname, './index.html')}`,
  );

  return win;
};

const getEmptyWindow = (): BrowserWindow => {
  if (emptyWindows.length > 0) {
    return emptyWindows.pop() as BrowserWindow;
  }
  return createEmptyWindow();
};

const createWindow = (args: string[] = [], newCwd?: string) => {
  const cwd = newCwd || process.cwd();

  // const fileNames = argsFileNames(args);
  // fileNames.forEach(fileName => {
  //   const resolved = resolve(cwd, fileName);
  //   if (windows.find(w => filename.startsWith(w.cwd))) {
  //   }
  // });

  const win = getEmptyWindow();

  // @ts-ignore TODO: don't add custom props to win
  win.cwd = cwd;

  if (currentWindow && !currentWindow.isFullScreen() && !currentWindow.isSimpleFullScreen()) {
    const [x, y] = currentWindow.getPosition();
    const [width, height] = currentWindow.getSize();
    win.setBounds({ x: x + 20, y: y + 20, width, height }, false);
  }

  initNvim({
    args: filterArgs(args),
    cwd,
    win,
  });

  const initRenderer = () => win.webContents.send('initRenderer', getSettings());

  if (win.webContents.isLoading()) {
    win.webContents.on('did-finish-load', initRenderer);
  } else {
    initRenderer();
  }

  win.focus();
  windows.push(win);

  if (args.includes('--inspect')) openDeveloperTools(win);

  setTimeout(() => emptyWindows.push(createEmptyWindow()), 1000);

  initAutoUpdate({ win });

  return win;
};

const openFileOrDir = (fileName: string) => {
  app.addRecentDocument(fileName);
  if (existsSync(fileName) && statSync(fileName).isDirectory()) {
    createWindow([fileName], fileName);
  } else {
    createWindow([fileName]);
  }
};

const openFile = () => {
  const fileNames = dialog.showOpenDialogSync({
    properties: ['openFile', 'openDirectory', 'createDirectory', 'multiSelections'],
  });
  if (fileNames) {
    fileNames.forEach(openFileOrDir);
  }
};

let fileToOpen: string | undefined | null;
app.on('will-finish-launching', () => {
  app.on('open-file', (_e, file) => {
    fileToOpen = file;
  });
});

app.on('ready', () => {
  checkNeovim();
  if (fileToOpen) {
    openFileOrDir(fileToOpen);
    fileToOpen = null;
  } else {
    createWindow(cliArgs());
  }
  menu({
    createWindow,
    openFile,
    installCli: installCli(join(app.getAppPath(), '../bin/vv')),
  });
  app.on('open-file', (_e, file) => openFileOrDir(file));
  app.focus();
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

app.on('activate', (_e, hasVisibleWindows) => {
  if (!hasVisibleWindows) {
    createWindow();
  }
});

if (!isDev(true, false)) {
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    app.quit();
  } else {
    app.on('second-instance', (_e, args, cwd) => {
      createWindow(cliArgs(args), cwd);
    });
  }
}
