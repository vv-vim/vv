import { app, BrowserWindow, dialog } from 'electron';
import { statSync, existsSync } from 'fs';
import { join, resolve } from 'path';

import isDev from 'src/lib/isDev';

import menu from 'src/main/menu';
import installCli from 'src/main/installCli';
import checkNeovim from 'src/main/checkNeovim';

import { setShouldQuit } from 'src/main/nvim/features/quit';
import { getSettings } from 'src/main/nvim/settings';
import { getNvimByWindow } from 'src/main/nvim/nvimByWindow';
import SimpleFullScreenStatusBarFix from 'src/main/lib/SimpleFullScreenStatusBarFix';

import initAutoUpdate from 'src/main/autoUpdate';

import initNvim from 'src/main/nvim/nvim';
import { parseArgs, joinArgs, filterArgs, cliArgs, argValue } from 'src/main/lib/args';

import IpcTransport from 'src/main/transport/ipc';

let currentWindow: BrowserWindow | undefined | null;

let simpleFullScreenStatusBarFix: SimpleFullScreenStatusBarFix;

const windows: BrowserWindow[] = [];

/** Empty windows created in advance to make windows creation faster */
const emptyWindows: BrowserWindow[] = [];

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

const createEmptyWindow = (isDebug = false) => {
  const options = {
    width: 800,
    height: 600,
    show: isDebug,
    fullscreenable: false,
    webPreferences: {
      preload: join(app.getAppPath(), isDev('./', '../'), 'src/main/preload.js'),
    },
  };
  let win = new BrowserWindow(options);
  // @ts-expect-error TODO
  win.zoomLevel = 0;

  win.on('closed', async () => {
    if (currentWindow === win) currentWindow = null;

    const i = windows.indexOf(win);
    if (i !== -1) windows.splice(i, 1);
    // @ts-expect-error TODO
    win = null;

    if (windows.length === 0) handleAllClosed();
  });

  win.on('focus', () => {
    currentWindow = win;
  });

  win.loadURL(
    process.env.DEV_SERVER ? 'http://localhost:3000' : `file://${join(__dirname, './index.html')}`,
  );

  simpleFullScreenStatusBarFix.addWindow(win);

  return win;
};

const getEmptyWindow = (isDebug = false): BrowserWindow => {
  if (emptyWindows.length > 0) {
    return emptyWindows.pop() as BrowserWindow;
  }
  return createEmptyWindow(isDebug);
};

const createWindow = async (originalArgs: string[] = [], newCwd?: string) => {
  const settings = getSettings();
  const cwd = newCwd || process.cwd();

  const isDebug = originalArgs.includes('--debug') || originalArgs.includes('--inspect');
  // TODO: Use yargs maybe.
  const { args, files } = parseArgs(filterArgs(originalArgs));
  let unopenedFiles = files;

  let { openInProject } = settings;
  let openInProjectArg = argValue(originalArgs, '--open-in-project');
  if (openInProjectArg === '0' || openInProjectArg === 'false') {
    openInProjectArg = undefined;
    openInProject = 0;
  }
  if (openInProjectArg === 'true') {
    openInProjectArg = '1';
  }

  // TODO: Rafactor this somewhere to a separate file or function.
  if (openInProject || openInProjectArg) {
    await Promise.all(
      windows.map(async (win) => {
        const nvim = getNvimByWindow(win);
        if (nvim) {
          // @ts-expect-error TODO: don't add custom props to win
          win.cwd = await nvim.callFunction<string>('VVprojectRoot', []); // eslint-disable-line
        }
        return Promise.resolve();
      }),
    );
    unopenedFiles = files.reduce<string[]>((result, fileName) => {
      const resolvedFileName = resolve(cwd, fileName);
      const openInWindow = windows.find(
        // @ts-expect-error TODO: don't add custom props to win
        (w) => resolvedFileName.startsWith(w.cwd) && !w.isMinimized(),
      );
      if (openInWindow) {
        const nvim = getNvimByWindow(openInWindow);
        if (nvim) {
          // @ts-expect-error TODO: don't add custom props to win
          const relativeFileName = resolvedFileName.substring(openInWindow.cwd.length + 1);
          nvim.callFunction(
            'VVopenInProject',
            openInProjectArg ? [relativeFileName, openInProjectArg] : [relativeFileName],
          );
          openInWindow.focus();
          app.focus({ steal: true });
          return result;
        }
      }
      return [...result, fileName];
    }, []);
  }

  if (files.length === 0 || unopenedFiles.length > 0) {
    const win = getEmptyWindow(isDebug);

    // @ts-expect-error TODO: don't add custom props to win
    win.cwd = cwd;

    if (currentWindow && !currentWindow.isFullScreen() && !currentWindow.isSimpleFullScreen()) {
      const [x, y] = currentWindow.getPosition();
      const [width, height] = currentWindow.getSize();
      win.setBounds({ x: x + 20, y: y + 20, width, height }, false);
    }

    const transport = new IpcTransport(win);

    initNvim({
      args: joinArgs({ args, files: unopenedFiles }),
      cwd,
      win,
      transport,
    });

    const initRenderer = () => transport.send('initRenderer', settings);

    if (win.webContents.isLoading()) {
      win.webContents.on('did-finish-load', initRenderer);
    } else {
      initRenderer();
    }

    win.focus();
    windows.push(win);

    if (isDebug) {
      openDeveloperTools(win);
    } else {
      setTimeout(() => emptyWindows.push(createEmptyWindow()), 1000);
    }

    initAutoUpdate({ win });
  }
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

const gotTheLock = isDev() || app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
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

    simpleFullScreenStatusBarFix = new SimpleFullScreenStatusBarFix();

    app.focus();
  });

  app.on('second-instance', (_e, args, cwd) => {
    createWindow(cliArgs(args), cwd);
  });

  app.on('before-quit', (e) => {
    setShouldQuit(true);
    const visibleWindows = windows.filter((w) => w.isVisible());
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
}
