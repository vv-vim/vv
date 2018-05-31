import { app, BrowserWindow } from 'electron';
import path from 'path';
import fixPath from 'fix-path';

import menu from './menu';

const windows = [];

const isDev = (dev = true, notDev = false) =>
  (process.env.NODE_ENV === 'development' ? dev : notDev);

const cliArgs = args => (args || process.argv).slice(isDev(2, 1));

const openDeveloperTools = (win) => {
  win.webContents.openDevTools({ mode: 'detach' });
  win.webContents.on('devtools-opened', () => {
    win.webContents.focus();
  });
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
    const i = windows.indexOf(win);
    if (i !== -1) windows.splice(i, 1);
    win = null;
  });

  if (isDev()) openDeveloperTools(win);

  win.focus();

  windows.push(win);

  return win;
};

app.on('ready', () => {
  createWindow(cliArgs());
  menu({ createWindow });
});

app.on('before-quit', async () => {
  for (let i = 0; i < windows.length; i += 1) {
    await windows[i].close(); // eslint-disable-line no-await-in-loop
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (windows.length === 0) {
    createWindow();
  }
});

if (!isDev()) {
  const shouldQuit = app.makeSingleInstance((args, cwd) => {
    createWindow(cliArgs(args), cwd);
  });

  if (shouldQuit) {
    app.quit();
  }
}
