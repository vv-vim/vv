import fs from 'fs';
import { nvim } from '../api';

const { remote: { getCurrentWindow } } = global.require('electron');

const currentWindow = getCurrentWindow();

const setTitle = (title) => {
  currentWindow.setTitle(title);
};

const setFilename = (filename) => {
  if (fs.existsSync(filename)) {
    currentWindow.setRepresentedFilename(filename);
  }
};

const handleNotification = async (method, args) => {
  if (method === 'redraw') {
    for (let i = 0; i < args.length; i += 1) {
      const [cmd, ...props] = args[i];
      if (cmd === 'set_title') {
        setTitle(props[0][0]);
      }
    }
  } else if (method === 'vv:filename') {
    setFilename(args[0]);
  }
};

const initWindowTitle = () => {
  nvim().on('notification', (method, args) => {
    handleNotification(method, args);
  });

  nvim().subscribe('vv:filename');

  // title and filename don't fire on startup, doing it manually
  nvim().command('set title');
  nvim().command('call rpcnotify(0, "vv:filename", expand("%:p"))');
};

export default initWindowTitle;
