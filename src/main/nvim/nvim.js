import { ipcMain } from 'electron';

import initQuit from './features/quit';

import nvimApi from './api';

const nvimByWindowId = [];

ipcMain.on('nvim-send', ({ sender: { id } }, payload) => {
  if (nvimByWindowId[id]) {
    nvimByWindowId[id].send(...payload);
  }
});

const initNvim = ({ args, cwd, win }) => {
  const nvim = nvimApi({
    args,
    cwd,
  });

  // TODO: Queue or smth if webContents are not ready
  nvim.on('data', data => win.webContents.send('nvim-data', data));

  nvim.on('disconnect', () => {
    delete nvimByWindowId[win.webContents.id];
  });

  nvimByWindowId[win.webContents.id] = nvim;

  initQuit({ win, nvim });
};

export default initNvim;
