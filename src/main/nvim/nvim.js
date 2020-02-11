import { ipcMain } from 'electron';

import { getNvimByWindow, setNvimByWindow, deleteNvimByWindow } from './nvimByWindow';

import quit from './features/quit';
import windowTitle from './features/windowTitle';
import zoom from './features/zoom';
import reloadChanged from './features/reloadChanged';
import windowSize from './features/windowSize';
import focusAutocmd from './features/focusAutocmd';

import settings from './settings';

import nvimApi from './api';

ipcMain.on('nvim-send', ({ sender: { id } }, payload) => {
  const nvim = getNvimByWindow(id);
  if (nvim) nvim.send(...payload);
});
const initNvim = ({ args, cwd, win }) => {
  const nvim = nvimApi({
    args,
    cwd,
  });
  setNvimByWindow(win, nvim);

  // TODO: Queue or smth if webContents are not ready
  nvim.on('data', data => win.webContents.send('nvim-data', data));

  nvim.on('disconnect', () => {
    deleteNvimByWindow(win);
  });

  settings({ win, nvim, args });

  windowSize({ win, args });

  quit({ win, nvim });
  windowTitle({ win, nvim });
  zoom({ win });
  reloadChanged({ win, nvim });
  focusAutocmd({ win, nvim });

  nvim.on('vv:vim_enter', () => {
    win.show();
  });
};

export default initNvim;
