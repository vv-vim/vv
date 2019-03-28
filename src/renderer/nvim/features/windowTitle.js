import fs from 'fs';
import { remote } from 'electron';

import nvim from '../api';

const currentWindow = remote.getCurrentWindow();

const setTitle = title => {
  currentWindow.setTitle(title);
};

const setFilename = ([filename]) => {
  if (fs.existsSync(filename)) {
    currentWindow.setRepresentedFilename(filename);
  }
};

const initWindowTitle = () => {
  nvim.on('redraw', args => {
    for (let i = 0; i < args.length; i += 1) {
      const [cmd, ...props] = args[i];
      if (cmd === 'set_title') {
        setTitle(props[0][0]);
      }
    }
  });

  nvim.on('vv:filename', setFilename);

  // title and filename don't fire on startup, doing it manually
  nvim.command('set title');
  nvim.command('call rpcnotify(0, "vv:filename", expand("%:p"))');
};

export default initWindowTitle;
