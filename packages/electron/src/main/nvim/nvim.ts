import { app, BrowserWindow } from 'electron';

import { Transport } from 'src/main/transport/types';

import { setNvimByWindow, deleteNvimByWindow } from 'src/main/nvim/nvimByWindow';

import quit from 'src/main/nvim/features/quit';
import windowTitle from 'src/main/nvim/features/windowTitle';
import zoom from 'src/main/nvim/features/zoom';
import reloadChanged from 'src/main/nvim/features/reloadChanged';
import windowSize from 'src/main/nvim/features/windowSize';
import focusAutocmd from 'src/main/nvim/features/focusAutocmd';

import initSettings from 'src/main/nvim/settings';

import nvimApi from 'src/main/nvim/api';

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
    appPath: app.getAppPath(),
  });
  setNvimByWindow(win, nvim);

  // TODO: Queue or smth if webContents are not ready
  nvim.on('data', (data) => transport.send('nvim-data', data));

  transport.on('nvim-send', (payload) => {
    // @ts-expect-error FIXME
    nvim.send(...payload);
  });

  transport.on('set-background-color', (bgColor: string) => {
    win.setBackgroundColor(bgColor);
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
