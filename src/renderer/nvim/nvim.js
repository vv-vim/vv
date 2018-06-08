import throttle from 'lodash/throttle';
import debounce from 'lodash/debounce';
import path from 'path';

import initScreen, { screenCoords } from './screen';
import initKeyboard from './input/keyboard';
import initMouse from './input/mouse';
import initQuit from './features/quit';
import initCopyPaste from './features/copyPaste';
import initFullScreen from './features/fullScreen';
import initZoom from './features/zoom';
import initWindowTitle from './features/windowTitle';
import reloadChanged from './features/reloadChanged';
import closeWindow from './features/closeWindow';

const { spawn } = global.require('child_process');
const { attach } = global.require('neovim');
const {
  remote: { getCurrentWindow },
  screen: { getPrimaryDisplay },
  ipcRenderer,
} = global.require('electron');

const currentWindow = getCurrentWindow();
let nvim;
let cols;
let rows;
let screen;

let windowLeftOriginal = currentWindow.getPosition()[0]; // eslint-disable-line prefer-destructuring
let windowTopOriginal = currentWindow.getPosition()[1]; // eslint-disable-line prefer-destructuring
let windowLeft = windowLeftOriginal;
let windowTop = windowTopOriginal;
let windowWidth = currentWindow.getSize()[0]; // eslint-disable-line prefer-destructuring
let windowHeight = currentWindow.getSize()[1]; // eslint-disable-line prefer-destructuring

let noResize = false;
let uiAttached = false;

const charUnderCursor = () => {
  nvim.command('VVcharUnderCursor');
};

const debouncedCharUnderCursor = debounce(charUnderCursor, 10);

const resize = async (forceRedraw = false) => {
  const [newCols, newRows] = screenCoords(
    window.innerWidth,
    window.innerHeight,
  );
  if (
    newCols > 0 &&
    newRows > 0 &&
    (newCols !== cols || newRows !== rows || forceRedraw)
  ) {
    cols = newCols;
    rows = newRows;
    if (!uiAttached) {
      currentWindow.show();
      [cols, rows] = screenCoords(window.innerWidth, window.innerHeight);
      await nvim.uiAttach(cols, rows, {});
      noResize = false;
      uiAttached = true;
    } else {
      nvim.uiTryResize(cols, rows);
    }
  }
};

const handleResize = debounce(resize, 100);

const debouncedRedraw = debounce(() => resize(true), 10);

const updateWindowSize = () => {
  if (
    !currentWindow.isFullScreen() &&
    !currentWindow.isSimpleFullScreen()
  ) {
    currentWindow.setSize(windowWidth, windowHeight);
  }
};

const debouncedUpdateWindowSize = debounce(updateWindowSize, 10);

const updateWindowPosition = () => {
  if (
    !currentWindow.isFullScreen() &&
    !currentWindow.isSimpleFullScreen()
  ) {
    const topOffset = Math.round(getPrimaryDisplay().bounds.height -
        getPrimaryDisplay().workAreaSize.height);
    currentWindow.setPosition(windowLeft, windowTop + topOffset);
  }
};

const debouncedUpdateWindowPosition = debounce(updateWindowPosition, 10);

// const boolValue = value => !!parseInt(value, 10);
const handleSet = {
  windowwidth: (w) => {
    if (noResize) return;
    let width = parseInt(w, 10);
    if (w.toString().indexOf('%') !== -1) {
      width = Math.round(getPrimaryDisplay().workAreaSize.width * width / 100);
    }
    windowWidth = width;
    debouncedUpdateWindowSize();
    handleSet.windowleft(windowLeftOriginal);
  },
  windowheight: (h) => {
    if (noResize) return;
    let height = parseInt(h, 10);
    if (h.toString().indexOf('%') !== -1) {
      height = Math.round(getPrimaryDisplay().workAreaSize.height * height / 100);
    }
    windowHeight = height;
    debouncedUpdateWindowSize();
    handleSet.windowtop(windowTopOriginal);
  },
  windowleft: (l) => {
    if (noResize) return;
    windowLeftOriginal = l;
    let left = parseInt(l, 10);
    if (l.toString().indexOf('%') !== -1) {
      const displayWidth = getPrimaryDisplay().workAreaSize.width;
      const winWidth = windowWidth;
      left = Math.round((displayWidth - winWidth) * left / 100);
    }
    windowLeft = left;
    debouncedUpdateWindowPosition();
  },
  windowtop: (t) => {
    if (noResize) return;
    windowTopOriginal = t;
    let top = parseInt(t, 10);
    if (t.toString().indexOf('%') !== -1) {
      const displayHeight = getPrimaryDisplay().workAreaSize.height;
      const winHeight = windowHeight;
      top = Math.round((displayHeight - winHeight) * top / 100);
    }
    windowTop = top;
    debouncedUpdateWindowPosition();
  },
  bold: (value) => {
    screen.vv_show_bold(value);
  },
  italic: (value) => {
    screen.vv_show_italic(value);
  },
  underline: (value) => {
    screen.vv_show_underline(value);
  },
  undercurl: (value) => {
    screen.vv_show_undercurl(value);
  },
  fontfamily: (value) => {
    screen.vv_fontfamily(value);
    debouncedRedraw();
  },
  fontsize: (value) => {
    screen.vv_fontsize(value);
    debouncedRedraw();
  },
  lineheight: (value) => {
    screen.vv_lineheight(value);
    debouncedRedraw();
  },
  letterspacing: (value) => {
    screen.vv_letterspacing(value);
    debouncedRedraw();
  },
};

const handleNotification = async (method, args) => {
  if (method === 'redraw') {
    for (let i = 0; i < args.length; i += 1) {
      const [cmd, ...props] = args[i];
      if (screen[cmd]) {
        screen[cmd](...props);
      } else {
        console.warn('Unknown redraw command', cmd, props); // eslint-disable-line no-console
      }
      if (cmd === 'cursor_goto' || cmd === 'put') {
        debouncedCharUnderCursor();
      }
    }
  } else if (method === 'vv:set') {
    const [option, ...props] = args;
    if (handleSet[option]) {
      handleSet[option](...props);
    }
  } else if (method === 'vv:char_under_cursor') {
    screen.vv_char_under_cursor(...args);
  } else if (
    !['vv:unsaved_buffers', 'vv:filename', 'vv:file_changed'].includes(method)
  ) {
    console.warn('Unknown notification', method, args); // eslint-disable-line no-console
  }
};

const vvSourceCommand = () =>
  `source ${path.join(currentWindow.resourcesPath, 'bin/vv.vim')}`;

// Source vv specific ext and fix colors on -u NONE
const fixNoConfig = async (args) => {
  const uFlagIndex = args.indexOf('-u');
  if (uFlagIndex !== -1 && args[uFlagIndex + 1] === 'NONE') {
    await nvim.command('hi Normal guifg=black guibg=white');
    await nvim.command(vvSourceCommand());
  }
};

const initNvim = async () => {
  screen = initScreen('screen');

  const { args, env, cwd } = currentWindow;

  noResize = currentWindow.noResize;

  const nvimProcess = spawn(
    'nvim',
    ['--embed', '--cmd', vvSourceCommand(), ...args],
    {
      stdio: ['pipe', 'pipe', process.stderr],
      env,
      cwd,
    },
  );

  nvim = await attach({ proc: nvimProcess });

  // Send null to reanimate nvim on startup files errors.
  // Still need to find the way to get errors correctly.
  nvim.input('<Nul>');

  nvim.on('notification', handleNotification);

  nvim.subscribe('vv:set');
  nvim.subscribe('vv:char_under_cursor');

  await fixNoConfig(args, vvSourceCommand);

  initFullScreen(nvim);
  initZoom(nvim);
  initKeyboard(nvim);
  initMouse(nvim);
  initQuit(nvim);
  initCopyPaste(nvim);
  initWindowTitle(nvim);
  reloadChanged(nvim);
  closeWindow(nvim);

  await nvim.command('VVsettings');

  nvim.command('doautocmd <nomodeline> GUIEnter');

  ipcRenderer.on('leave-full-screen', () => {
    updateWindowSize();
    updateWindowPosition();
  });
  window.addEventListener('resize', handleResize);
};

document.addEventListener('DOMContentLoaded', initNvim);
