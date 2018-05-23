const { app, BrowserWindow } = require('electron');
const path = require('path');
const fixPath = require('fix-path');

const createMenu = require('./menu');

const windows = [];

const isDev = (dev = true, notDev = false) =>
  (process.env.ELECTRON_ENV === 'development' ? dev : notDev);

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
  });

  fixPath();
  win.args = args;
  win.env = process.env;
  win.cwd = cwd;
  win.resourcesPath = path.join(app.getAppPath(), isDev('', '../'));

  // win.maximize();
  win.show();

  win.loadURL(isDev(
    'http://localhost:3000',
    `file://${path.join(__dirname, '../build/index.html')}`,
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

const selectAll = win => () => {
  win.webContents.send('selectAll');
};

app.on('ready', async () => {
  const win = createWindow(cliArgs());
  createMenu({ createWindow, openDeveloperTools, selectAll: selectAll(win) });
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
