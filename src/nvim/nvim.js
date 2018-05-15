import screen from './screen';

const childProcess = global.require('child_process');
const { attach } = global.require('neovim');

const { remote } = global.require('electron');

let nvim;
const mainWindow = remote.getCurrentWindow();
let cols;
let rows;

const getKey = (event) => {
  // console.log('getkey', event);
  const { key, ctrlKey, keyCode } = event;

  switch (key) {
    case 'Escape': {
      if (ctrlKey && keyCode !== 27) {
        // Note:
        // When <C-[> is input
        // XXX:
        // Keycode of '[' is not available because it is 219 in OS X
        // and it is not for '['.
        return '[';
      }
      return '<Esc>';
    }
    case 'Backspace': {
      if (ctrlKey && keyCode === 72) {
        // Note:
        // When <C-h> is input (72 is key code of 'h')
        return 'h';
      }
      return '<BS>';
    }
    case 'Enter': {
      return '<CR>';
    }
    case 'Shift': {
      return null;
    }
    default: {
      return key;
    }
  }
};

const handleKeydown = (event) => {
  const key = getKey(event);
  if (key) {
    nvim.request('vim_input', [key]);
  }
};

const charWidth = () => 7.2;
const charHeight = () => 15;


const resize = () => {
  const newCols = Math.floor(window.innerWidth / charWidth());
  const newRows = Math.floor(window.innerHeight / charHeight());
  if (newCols !== cols || newRows !== rows) {
    cols = newCols;
    rows = newRows;
    nvim.request('ui_try_resize', [cols, rows]);
  }
};

let resizeTimeout;
const handleResize = () => {
  if (resizeTimeout) {
    clearTimeout(resizeTimeout);
  }
  resizeTimeout = setTimeout(resize, 500);
};

const handleNotification = async (method, args) => {
  if (method === 'redraw') {
    for (let i = 0; i < args.length; i += 1) {
      const [cmd, ...props] = args[i];
      try {
        // console.log(cmd, props);
        screen[cmd](props);
      } catch (e) {
        console.warn('Unknown redraw command', cmd, props); // eslint-disable-line no-console
      }
    }
  } else if (method === 'vvim:fullscreen') {
    mainWindow.setSimpleFullScreen(!!args[0]);
    mainWindow.webContents.focus();
  } else {
    console.warn('Unknown notification', method, args); // eslint-disable-line no-console
  }
};


async function initNvim(cols, rows) {
  // mainWindow.setSimpleFullScreen(true);
  const nvimProcess = childProcess.spawn('nvim', ['--embed', 'test/test.jsx'], {
    stdio: ['pipe', 'pipe', process.stderr],
  });

  nvim = await attach({ proc: nvimProcess });

  nvim.request('ui_attach', [cols, rows, true]);

  nvim.on('notification', (method, args) => {
    handleNotification(method, args);
  });

  nvim.command('command Fu call rpcnotify(0, "vvim:fullscreen", 1)');
  nvim.command('command Nofu call rpcnotify(0, "vvim:fullscreen", 0)');
  nvim.subscribe('vvim:fullscreen');

  handleResize(cols, rows);
  window.nvim = nvim;
  document.addEventListener('keydown', handleKeydown);
  window.addEventListener('resize', handleResize);
}

document.addEventListener('DOMContentLoaded', () => initNvim(150, 50));
