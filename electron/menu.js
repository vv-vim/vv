const { Menu } = require('electron');

const createMenu = ({ createWindow, openDeveloperTools, selectAll }) => {
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
          click: () => selectAll(),
        },
      ],
    },
    {
      label: 'Tools',
      submenu: [
        {
          label: 'Open Developer Tools',
          accelerator: 'Cmd+Alt+I',
          click: (i, win) => openDeveloperTools(win),
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
  Menu.setApplicationMenu(menu);
};

module.exports = createMenu;
