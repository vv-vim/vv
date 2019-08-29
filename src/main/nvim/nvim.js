import { ipcMain } from 'electron';

import {
  getNvimByWindow,
  setNvimByWindow,
  deleteNvimByWindow,
} from './nvimByWindow';

import quit from './features/quit';
import windowTitle from './features/windowTitle';
import zoom from './features/zoom';
import reloadChanged from './features/reloadChanged';
import fullscreen from './features/fullscreen';

import settings from './settings';

import showWindow from './showWindow';

import nvimApi from './api';

// import store from '../../lib/store';

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

  settings({ win, nvim });
  showWindow({ win, nvim });

  quit({ win, nvim });
  windowTitle({ win, nvim });
  zoom({ win });
  reloadChanged({ win, nvim });
  fullscreen({ win, nvim });
};

export default initNvim;
