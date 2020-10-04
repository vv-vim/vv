import { BrowserWindow } from 'electron';

import { Transport } from '@main/transport/transport';

import { setNvimByWindow, deleteNvimByWindow } from '@main/nvim/nvimByWindow';

import quit from '@main/nvim/features/quit';
import windowTitle from '@main/nvim/features/windowTitle';
import zoom from '@main/nvim/features/zoom';
import reloadChanged from '@main/nvim/features/reloadChanged';
import windowSize from '@main/nvim/features/windowSize';
import focusAutocmd from '@main/nvim/features/focusAutocmd';

import initSettings from '@main/nvim/settings';

import nvimApi from '@main/nvim/api';

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
