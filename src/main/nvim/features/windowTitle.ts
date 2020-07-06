import fs from 'fs';

import { BrowserWindow } from 'electron';
import { Nvim } from '../api';

const initWindowTitle = ({ nvim, win }: { win: BrowserWindow; nvim: Nvim }) => {
  nvim.on('redraw', (args) => {
    for (let i = 0; i < args.length; i += 1) {
      const [cmd, ...props] = args[i];
      if (cmd === 'set_title') {
        win.setTitle(props[0][0]);
      }
    }
  });

  nvim.on('vv:filename', ([filename]) => {
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
