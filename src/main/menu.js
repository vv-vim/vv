import { Menu } from 'electron';

// import { handleCloseWindow } from './nvim/features/closeWindow';

import { copy, paste, selectAll } from './nvim/features/copyPaste';
import { zoomIn, zoomOut, actualSize} from './nvim/features/zoom'

let menu;

const toggleFullScreen = (_item, win) => {
  win.webContents.send('toggleFullScreen');
};

const createMenu = ({ createWindow, openFile, installCli }) => {
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
        /*
          { type: 'separator' },
          {
            label: 'Close',
            accelerator: 'CmdOrCtrl+W',
            click: handleCloseWindow,
          },
        */
      ],
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          click: copy,
        },
        {
          label: 'Paste',
          accelerator: 'CmdOrCtrl+V',
          click: paste,
        },
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
