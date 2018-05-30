import { Menu } from 'electron';

let win;
let zoomLevel = 0;
let actualSizeItem;

const selectAll = () => {
  win.webContents.send('selectAll');
};

const toggleFullScreen = () => {
  win.webContents.send('toggleFullScreen');
};

const disableActualSizeItem = () => {
  actualSizeItem.enabled = zoomLevel !== 0;
};

const zoomIn = () => {
  zoomLevel += 1;
  win.webContents.send('zoom', 1);
  disableActualSizeItem();
};

const zoomOut = () => {
  zoomLevel -= 1;
  win.webContents.send('zoom', -1);
  disableActualSizeItem();
};

const actualSize = () => {
  win.webContents.send('zoom', -zoomLevel);
  zoomLevel = 0;
  disableActualSizeItem();
};

const createMenu = (newWin, { createWindow }) => {
  win = newWin;
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
          click: () => createWindow(),
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
          accelerator: 'CmdOrCtrl+Plus',
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
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
  ];
  const menu = Menu.buildFromTemplate(menuTemplate);
  actualSizeItem = menu.getMenuItemById('actualSize');
  Menu.setApplicationMenu(menu);
};

module.exports = createMenu;
