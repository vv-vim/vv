import { remote, ipcRenderer } from 'electron';

import nvim from '../api';

const currentWindow = remote.getCurrentWindow();

const handleCloseWindow = () => {
  nvim.command('VVcloseWindow');
};

const initCloseWindow = () => {
  nvim.on('vv:close_window', () => {
    currentWindow.webContents.send('quit');
  });

  ipcRenderer.on('closeWindow', handleCloseWindow);
};

export default initCloseWindow;
