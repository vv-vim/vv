import throttle from 'lodash/throttle';
import debounce from 'lodash/debounce';
import path from 'path';

import initScreen, { screenCoords } from './screen';
import { eventKeyCode } from './input';

const { spawn } = global.require('child_process');
const { attach } = global.require('neovim');
const { remote, ipcRenderer } = global.require('electron');

const currentWindow = remote.getCurrentWindow();

let nvim;
let cols;
let rows;

let screen;

const charUnderCursor = () => {
  nvim.command('VVcharUnderCursor');
};

const debouncedCharUnderCursor = debounce(charUnderCursor, 10);

const handleKeydown = (event) => {
  const key = eventKeyCode(event);
  if (key) nvim.input(key);
};

const resize = () => {
  const [newCols, newRows] = screenCoords(window.innerWidth, window.innerHeight);
  if (newCols !== cols || newRows !== rows) {
    cols = newCols;
    rows = newRows;
    nvim.uiTryResize(cols, rows);
  }
};

const handleResize = throttle(resize, 100);

const handleSet = {
  fullscreen: (value) => {
    currentWindow.setSimpleFullScreen(!!value);
    currentWindow.webContents.focus();
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
};

const handleNotification = async (method, args) => {
  if (method === 'redraw') {
    for (let i = 0; i < args.length; i += 1) {
      const [cmd, ...props] = args[i];
      if (screen[cmd]) {
        // console.log(cmd, props);
        screen[cmd](...props);
      } else {
        console.warn('Unknown redraw command', cmd, props); // eslint-disable-line no-console
      }
      if (cmd === 'cursor_goto' || cmd === 'put') {
        // TODO: request char from screen maybe?
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

const handlePaste = async (event) => {
  event.preventDefault();
  event.stopPropagation();
  const clipboardText = event.clipboardData
    .getData('text')
    .replace('<', '<lt>');
  const { mode } = await nvim.mode;
  if (mode === 'i') {
    await nvim.command('set paste');
    await nvim.input(clipboardText);
    await nvim.command('set nopaste');
  } else {
    nvim.input(mode === 'c' ? clipboardText : '"*p');
  }
};

const handleCopy = async (event) => {
  event.preventDefault();
  event.stopPropagation();
  const { mode } = await nvim.mode;
  if (mode === 'v' || mode === 'V') {
    nvim.input('"*y');
  }
};

let mouseButtonDown;
let mouseCoords = [];
const mouseCoordsChanged = (event) => {
  const newCoords = screenCoords(event.clientX, event.clientY);
  if (newCoords[0] !== mouseCoords[0] || newCoords[1] !== mouseCoords[1]) {
    mouseCoords = newCoords;
    return true;
  }
  return false;
};

const handleMousedown = (event) => {
  event.preventDefault();
  event.stopPropagation();
  if (mouseCoordsChanged(event)) {
    mouseButtonDown = true;
    nvim.input(`<LeftMouse><${mouseCoords[0]}, ${mouseCoords[1]}>`);
  }
};

const handleMouseup = (event) => {
  if (mouseButtonDown) {
    event.preventDefault();
    event.stopPropagation();
    mouseButtonDown = false;
  }
};

const mousemove = (event) => {
  if (mouseButtonDown) {
    event.preventDefault();
    event.stopPropagation();
    if (mouseCoordsChanged(event)) {
      nvim.input(`<LeftDrag><${mouseCoords[0]}, ${mouseCoords[1]}>`);
    }
  }
};

const handleMousemove = throttle(mousemove, 50);

const handleSelectall = () => {
  nvim.input('ggVG');
};

const closeWindow = async () => {
  await currentWindow.hide();
  await currentWindow.setSimpleFullScreen(false);
  currentWindow.close();
};

const initNvim = async () => {
  screen = initScreen('screen');
  screen.vv_font_style('SFMono-Light', 12, 15, -1);

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

  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('mousedown', handleMousedown);
  document.addEventListener('mouseup', handleMouseup);
  document.addEventListener('mousemove', handleMousemove);
  document.addEventListener('paste', handlePaste);
  document.addEventListener('copy', handleCopy);

  ipcRenderer.on('selectAll', handleSelectall);

  window.addEventListener('resize', handleResize);

  window.nvim = nvim;
};

document.addEventListener('DOMContentLoaded', initNvim);
