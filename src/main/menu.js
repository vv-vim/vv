import { Menu, app, globalShortcut } from 'electron';

let menu;

const selectAll = (_item, win) => {
  win.webContents.send('selectAll');
};

const toggleFullScreen = (_item, win) => {
  win.webContents.send('toggleFullScreen');
};

const disableActualSizeItem = win => {
  menu.getMenuItemById('actualSize').enabled = win.zoomLevel !== 0;
};

const zoomIn = (_item, win) => {
  win.zoomLevel += 1; // eslint-disable-line no-param-reassign
  win.webContents.send('zoom', 1);
  disableActualSizeItem(win);
};

const zoomOut = (_item, win) => {
  win.zoomLevel -= 1; // eslint-disable-line no-param-reassign
  win.webContents.send('zoom', -1);
  disableActualSizeItem(win);
};

const actualSize = (_item, win) => {
  win.webContents.send('zoom', -win.zoomLevel);
  win.zoomLevel = 0; // eslint-disable-line no-param-reassign
  disableActualSizeItem(win);
};

export const refreshMenu = win => {
  disableActualSizeItem(win);
};

const createMenu = ({ createWindow, openFile, closeWindow, installCli }) => {
  const menuTemplate = [
    {
      label: 'VV',
      submenu: [
        { role: 'about' },
        {
          label: 'Command Line Launcher...',
          click: installCli,
        },
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
          click: () => createWindow(),
        },
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: openFile,
        },
        {
          role: 'recentdocuments',
          submenu: [
            {
              role: 'clearrecentdocuments',
            },
          ],
        },
        { type: 'separator' },
        {
          label: 'Close',
          accelerator: 'CmdOrCtrl+W',
          click: closeWindow,
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'copy' },
        { role: 'paste' },
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          click: selectAll,
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Full Screen',
          accelerator: 'Cmd+Ctrl+F',
          click: toggleFullScreen,
        },
        {
          label: 'Actual Size',
          id: 'actualSize',
          accelerator: 'CmdOrCtrl+0',
          click: actualSize,
          enabled: false,
        },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: zoomIn,
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: zoomOut,
        },
        { type: 'separator' },
        {
          label: 'Developer',
          submenu: [{ role: 'toggleDevTools' }],
        },
      ],
    },
    {
      role: 'window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { type: 'separator' }, { role: 'front' }],
    },
  ];
  menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
};

export default createMenu;
