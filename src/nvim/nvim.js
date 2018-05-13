import { initScreen, redrawCmd } from './screen';

const childProcess = global.require('child_process');
const { attach } = global.require('neovim');

let nvim;

const handleNotification = async (method, args) => {
  if (method === 'redraw') {
    for (let i = 0; i < args.length; i += 1) {
      const [cmd, ...props] = args[i];
      try {
        // console.log(cmd, props);
        redrawCmd[cmd](props);
      } catch (e) {
        // console.warn('Unknown redraw command', cmd, props); // eslint-disable-line no-console
      }
    }
  } else {
    // console.warn('Unknown notification', method, args); // eslint-disable-line no-console
  }
};

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

async function initNvim(cols, rows) {
  const nvimProcess = childProcess.spawn('nvim', ['--embed', 'test/test.jsx'], {
    stdio: ['pipe', 'pipe', process.stderr],
  });

  nvim = await attach({ proc: nvimProcess });

  nvim.request('ui_attach', [cols, rows, true]);

  nvim.on('notification', (method, args) => {
    handleNotification(method, args);
  });

  // nvim.command('autocmd VimEnter,BufWinEnter * call rpcnotify(0, "vvim:refresh_windows")');
  // nvim.subscribe('vvim:refresh_windows');

  initScreen(cols, rows);
  window.nvim = nvim;
  document.addEventListener('keydown', handleKeydown);
}

document.addEventListener('DOMContentLoaded', () => initNvim(150, 50));
