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

  

  // Store initial settings to make window open faster. When window is shown current settings are
  // stored to initialSettings. And next time when new window is created we use these settings by
  // default and change it if settings from vim config are changed.
  // let newSettings = store.get('initialSettings') || {};
  // let initialSettings;
  // const settings = {};
  //
  // const defaultSettings = {
  //   fullscreen: 0,
  //   simplefullscreen: 1,
  //   bold: 1,
  //   italic: 1,
  //   underline: 1,
  //   undercurl: 1,
  //   fontfamily: 'monospace',
  //   fontsize: 12,
  //   lineheight: 1.25,
  //   letterspacing: 0,
  // };

  showWindow({ win, nvim });

  quit({ win, nvim });
  windowTitle({ win, nvim });
  zoom({ win });
  reloadChanged({ win, nvim });
};

export default initNvim;
