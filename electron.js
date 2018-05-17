const electron = require('electron');

const {
  app, Menu, BrowserWindow,
} = electron;

const windows = [];

function createWindow() {
  // Create the browser window.
  // win = new BrowserWindow({
  //   width: 800,
  //   height: 600,
  //   // fullscreen: true,
  //   // simpleFullscreen: true,
  // });

  let win = new BrowserWindow({
    frame: false,
    transparent: true,
    width: 800,
    height: 600,
    show: false,
  });
  // win.maximize();
  win.show();

  win.loadURL('http://localhost:3000');

  win.on('closed', () => {
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
}

const createMenu = () => {
  const menuTemplate = [
    {
      label: 'Vvim',
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

app.on('ready', () => {
  createMenu();
  createWindow();
});

app.on('before-quit', () => {
  for (let i = 0; i < windows.length; i += 1) {
    windows[i].hide();
    windows[i].setSimpleFullScreen(false);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (windows.length === 0) {
    createWindow();
  }
});
