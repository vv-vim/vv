const { app, Menu, BrowserWindow } = require('electron');
const path = require('path');
const fixPath = require('fix-path');
const { spawn } = require('child_process');
const { attach } = require('neovim');

const windows = [];

const createWindow = async () => {
  fixPath();

  console.log(['--embed', ...process.argv.slice(process.env.ELECTRON_ENV === 'development' ? 2 : 1)]);

  const nvimProcess = spawn('nvim', ['--embed', ...process.argv.slice(process.env.ELECTRON_ENV === 'development' ? 2 : 1)], {
    stdio: ['pipe', 'pipe', process.stderr],
  });

  let win = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
  });

  win.nvim = await attach({ proc: nvimProcess });

  // win.maximize();
  win.show();

  win.loadURL(process.env.ELECTRON_ENV === 'development'
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`);

  win.on('closed', async () => {
    await win.hide();
    await win.setSimpleFullScreen(false);
    const i = windows.indexOf(win);
    if (i !== -1) windows.splice(i, 1);
    win = null;
  });

  win.webContents.setFrameRate(30);
  win.webContents.openDevTools({ mode: 'detach' });

  win.webContents.on('devtools-opened', () => {
    win.webContents.focus();
  });

  windows.push(win);
};

const createMenu = () => {
  const menuTemplate = [
    {
      label: 'VV',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services', submenu: [] },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+N',
          click() {
            createWindow();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [{ role: 'copy' }, { role: 'paste' }],
    },
    {
      role: 'window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
  ];
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
};

app.on('ready', async () => {
  createMenu();
  createWindow();
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
