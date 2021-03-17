import { app } from 'electron';

import Nvim from '@vvim/nvim';

import { setNvimByWindow } from 'src/main/nvim/nvimByWindow';

import quit from 'src/main/nvim/features/quit';
import windowTitle from 'src/main/nvim/features/windowTitle';
import zoom from 'src/main/nvim/features/zoom';
import reloadChanged from 'src/main/nvim/features/reloadChanged';
import windowSize from 'src/main/nvim/features/windowSize';
import focusAutocmd from 'src/main/nvim/features/focusAutocmd';
import backgroundColor from 'src/main/nvim/features/backrdoundColor';

import initSettings from 'src/main/nvim/settings';

import startNvimProcess from 'src/main/nvim/process';
import ProcNvimTransport from 'src/main/nvim/ProcNvimTransport';

import type { BrowserWindow } from 'electron';
import type { Transport } from 'src/main/transport/types';

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
  const proc = startNvimProcess({ args, cwd, appPath: app.getAppPath() });
  const nvimTransport = new ProcNvimTransport(proc);
  const nvim = new Nvim(nvimTransport);

  nvimTransport.read((data) => transport.send('nvim-data', data));
  nvimTransport.onClose(() => transport.send('nvim-close'));
  transport.on('nvim-send', (payload: Parameters<ProcNvimTransport['write']>) =>
    nvimTransport.write(...payload),
  );

  setNvimByWindow(win, nvim);

  initSettings({ win, nvim, args, transport });
  windowSize({ win });
  quit({ win, nvim });
  windowTitle({ win, nvim });
  zoom({ win });
  reloadChanged({ win, nvim });
  focusAutocmd({ win, nvim });
  backgroundColor({ win, transport });

  nvim.on('vv:vim_enter', () => {
    win.show();
  });
};

export default initNvim;
