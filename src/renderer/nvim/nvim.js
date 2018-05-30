import throttle from 'lodash/throttle';
import debounce from 'lodash/debounce';
import path from 'path';

import initScreen, { screenCoords } from './screen';
import keyboard from './keyboard';
import mouse from './mouse';
import menu from './menu';

const { spawn } = global.require('child_process');
const { attach } = global.require('neovim');
const { remote, ipcRenderer } = global.require('electron');

const currentWindow = remote.getCurrentWindow();

let nvim;
let cols;
let rows;

let screen;

let simpleFullScreen = true;

const charUnderCursor = () => {
  nvim.command('VVcharUnderCursor');
};

const debouncedCharUnderCursor = debounce(charUnderCursor, 10);

const resize = (forceRedraw = false) => {
  const [newCols, newRows] = screenCoords(
    window.innerWidth,
    window.innerHeight,
  );
  if (newCols !== cols || newRows !== rows || forceRedraw) {
    cols = newCols;
    rows = newRows;
    nvim.uiTryResize(cols, rows);
  }
};

const handleResize = throttle(resize, 100);

const debouncedRedraw = debounce(() => resize(true), 10);

const boolValue = value => !!parseInt(value, 10);

const handleSet = {
  fullscreen: (value) => {
    if (simpleFullScreen) {
      currentWindow.setSimpleFullScreen(boolValue(value));
    } else {
      currentWindow.setFullScreen(boolValue(value));
    }
    currentWindow.webContents.focus();
  },
  simplefullscreen: (value) => {
    simpleFullScreen = boolValue(value);
    if (simpleFullScreen && currentWindow.isFullScreen()) {
      currentWindow.setFullScreen(false);
      currentWindow.setSimpleFullScreen(true);
      currentWindow.webContents.focus();
    } else if (currentWindow.isSimpleFullScreen()) {
      currentWindow.setSimpleFullScreen(false);
      currentWindow.setFullScreenable(true);
      currentWindow.setFullScreen(true);
      currentWindow.webContents.focus();
    }
    currentWindow.setFullScreenable(!simpleFullScreen);
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
  } else {
    console.warn('Unknown notification', method, args); // eslint-disable-line no-console
  }
};

const closeWindow = async () => {
  await currentWindow.hide();
  await currentWindow.setSimpleFullScreen(false);
  currentWindow.close();
};

const initNvim = async () => {
  screen = initScreen('screen');

  const {
    args, env, cwd, resourcesPath,
  } = currentWindow;

  const nvimProcess = spawn(
    'nvim',
    ['--embed', '-u', path.join(resourcesPath, 'bin/vv.vim'), ...args],
    {
      stdio: ['pipe', 'pipe', process.stderr],
      env,
      cwd,
    },
  );

  nvim = await attach({ proc: nvimProcess });

  nvim.on('notification', (method, args) => {
    handleNotification(method, args);
  });

  nvim.on('disconnect', closeWindow);

  nvim.subscribe('vv:set');
  nvim.subscribe('vv:char_under_cursor');

  await nvim.command('VVsettings');

  [cols, rows] = screenCoords(window.innerWidth, window.innerHeight);

  await nvim.uiAttach(cols, rows, {});

  const {
    handleMousedown,
    handleMouseup,
    handleMousemove,
    handleMousewheel,
  } = mouse(nvim);

  const {
    handleKeydown,
  } = keyboard(nvim);

  const {
    handlePaste,
    handleCopy,
    handleSelectAll,
    handleToggleFullScreen,
    handleZoom,
  } = menu(nvim);

  document.addEventListener('keydown', handleKeydown);

  document.addEventListener('mousedown', handleMousedown);
  document.addEventListener('mouseup', handleMouseup);
  document.addEventListener('mousemove', handleMousemove);
  document.addEventListener('wheel', handleMousewheel);

  document.addEventListener('paste', handlePaste);
  document.addEventListener('copy', handleCopy);
  ipcRenderer.on('selectAll', handleSelectAll);
  ipcRenderer.on('toggleFullScreen', handleToggleFullScreen);
  ipcRenderer.on('zoom', handleZoom);

  window.addEventListener('resize', handleResize);

  window.nvim = nvim;
};

document.addEventListener('DOMContentLoaded', initNvim);
