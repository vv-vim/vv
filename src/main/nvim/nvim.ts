import { BrowserWindow } from 'electron';

import { Transport } from '@main/transport/transport';

import { setNvimByWindow, deleteNvimByWindow } from './nvimByWindow';

import quit from './features/quit';
import windowTitle from './features/windowTitle';
import zoom from './features/zoom';
import reloadChanged from './features/reloadChanged';
import windowSize from './features/windowSize';
import focusAutocmd from './features/focusAutocmd';

import initSettings from './settings';

import nvimApi from './api';

const initNvim = ({
  args,
  cwd,
  win,
  transport,
}: {
  args: string[];
  cwd: string;
  win: BrowserWindow;
  transport: Transport;
}): void => {
  const nvim = nvimApi({
    args,
    cwd,
  });
  setNvimByWindow(win, nvim);

  // TODO: Queue or smth if webContents are not ready
  nvim.on('data', (data) => transport.send('nvim-data', data));

  transport.on('nvim-send', (payload) => {
    // @ts-ignore FIXME
    nvim.send(...payload);
  });

  nvim.on('disconnect', () => {
    // TODO: remove listeners from transport?
    deleteNvimByWindow(win);
  });

  initSettings({ win, nvim, args, transport });

  windowSize({ win });

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
