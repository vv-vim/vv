import { initScreen, cmdPut, cmdCursorGoto, cmdEolClear, cmdHighlightSet, cmdUpdateFg, cmdUpdateBg, cmdClear } from './screen';

const { ipcRenderer } = window.require('electron');

const handleNotification = (e, arg) => {
  console.log('nvim:notification', arg);
  // const d = Date.now()
  if (arg.method === 'redraw') {
    for (let i = 0; i < arg.args.length; i += 1) {
      const [cmd, ...props] = arg.args[i];
      // console.log('cmd', cmd, props);
      if (cmd === 'put') {
        cmdPut(props);
      } else if (cmd === 'cursor_goto') {
        cmdCursorGoto(props);
      } else if (cmd === 'eol_clear') {
        cmdEolClear();
      } else if (cmd === 'highlight_set') {
        cmdHighlightSet(props);
      } else if (cmd === 'update_fg') {
        cmdUpdateFg(props);
      } else if (cmd === 'update_bg') {
        cmdUpdateBg(props);
      } else if (cmd === 'clear') {
        cmdClear();
      } else {
        // console.log('Unknown =========', cmd);
      }
    }
  }
  // console.log(`nvim:notification time=${Date.now() - d}`, arg);
};

const handleKeydown = (event) => {
  const key = getKey(event);
  if (key) {
    ipcRenderer.send('nvim:input', key);
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
  }
  return key;
};

const initNvim = () => {
  // console.log('initvim');
  initScreen(150, 50);
  ipcRenderer.on('nvim:notification', handleNotification);
  ipcRenderer.send('nvim:init');
  document.addEventListener('keydown', handleKeydown);
};


document.addEventListener('DOMContentLoaded', initNvim);
