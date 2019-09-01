import { Menu } from 'electron';

// import { handleCloseWindow } from './nvim/features/closeWindow';

import { copyMenuItem, pasteMenuItem, selectAllMenuItem } from './nvim/features/copyPaste';
import { zoomInMenuItem, zoomOutMenuItem, actualSizeMenuItem } from './nvim/features/zoom';
import { closeWindowMenuItem } from './nvim/features/closeWindow';
import { toggleFullScreenMenuItem } from './nvim/features/fullScreen';

let menu;

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
        { type: 'separator' },
        {
          label: 'Close',
          accelerator: 'CmdOrCtrl+W',
          click: closeWindowMenuItem,
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          click: copyMenuItem,
        },
        {
          label: 'Paste',
          accelerator: 'CmdOrCtrl+V',
          click: pasteMenuItem,
        },
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          click: selectAllMenuItem,
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Full Screen',
          accelerator: 'Cmd+Ctrl+F',
          click: toggleFullScreenMenuItem,
        },
        {
          label: 'Actual Size',
          id: 'actualSize',
          accelerator: 'CmdOrCtrl+0',
          click: actualSizeMenuItem,
          enabled: false,
        },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: zoomInMenuItem,
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: zoomOutMenuItem,
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
