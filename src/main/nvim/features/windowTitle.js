import fs from 'fs';

const initWindowTitle = ({ nvim, win }) => {
  nvim.on('redraw', args => {
    for (let i = 0; i < args.length; i += 1) {
      const [cmd, ...props] = args[i];
      if (cmd === 'set_title') {
        win.setTitle(props[0][0])
      }
    }
  });

  nvim.on('vv:filename', ([filename]) => {
    if (fs.existsSync(filename)) {
      win.setRepresentedFilename(filename);
    }
  });

  // title and filename don't fire on startup, doing it manually
  nvim.command('set title');
  nvim.command('call rpcnotify(0, "vv:filename", expand("%:p"))');
};

export default initWindowTitle;
