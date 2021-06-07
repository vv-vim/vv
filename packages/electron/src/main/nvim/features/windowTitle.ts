import fs from 'fs';
import { BrowserWindow } from 'electron';

import type Nvim from '@vvim/nvim';

const initWindowTitle = ({ nvim, win }: { win: BrowserWindow; nvim: Nvim }): void => {
  nvim.on('redraw', (args) => {
    args.forEach((arg) => {
      if (arg[0] === 'set_title') {
        win.setTitle(arg[1][0]);
      }
    });
  });

  nvim.on<[string]>('vv:filename', ([filename]) => {
    if (fs.existsSync(filename)) {
      win.setRepresentedFilename(filename);
    }
  });

  nvim.command('set title'); // Enable title
  nvim.command('set titlestring&'); // Set default titlestring

  // Send current file name to client on buffer enter
  nvim.command('autocmd BufEnter * call rpcnotify(0, "vv:filename", expand(\'%:p\'))');

  // Filename don't fire on startup, doing it manually
  nvim.command('call rpcnotify(0, "vv:filename", expand("%:p"))');
};

export default initWindowTitle;
