import throttle from 'lodash/throttle';
import debounce from 'lodash/debounce';

import screen from './screen';
import { eventKeyCode } from './input';

const { spawn } = global.require('child_process');
const { attach } = global.require('neovim');

const { remote, ipcRenderer } = global.require('electron');

const currentWindow = remote.getCurrentWindow();
let nvim;
let cols;
let rows;

const charWidth = () => Math.floor(7.2);
const charHeight = () => Math.floor(15);

const charUnderCursor = () => {
  nvim.command('call rpcnotify(0, "vv:char_under_cursor", matchstr(getline("."), \'\\%\' . col(\'.\') . \'c.\'), synIDattr(synIDtrans(synID(line("."), col("."), 1)), "bold"), synIDattr(synIDtrans(synID(line("."), col("."), 1)), "italic"), synIDattr(synIDtrans(synID(line("."), col("."), 1)), "underline"), synIDattr(synIDtrans(synID(line("."), col("."), 1)), "undercurl"))');
};

const debouncedCharUnderCursor = debounce(charUnderCursor, 10);

const handleKeydown = (event) => {
  const key = eventKeyCode(event);
  if (key) nvim.input(key);
};

const resize = () => {
  const newCols = Math.floor(window.innerWidth / charWidth());
  const newRows = Math.floor(window.innerHeight / charHeight());
  if (newCols !== cols || newRows !== rows) {
    cols = newCols;
    rows = newRows;
    nvim.uiTryResize(cols, rows);
  }
};

const handleResize = throttle(resize, 100);

const handleNotification = async (method, args) => {
  if (method === 'redraw') {
    for (let i = 0; i < args.length; i += 1) {
      const [cmd, ...props] = args[i];
      if (screen[cmd]) {
        screen[cmd](props);
      } else {
        console.warn('Unknown redraw command', cmd, props); // eslint-disable-line no-console
      }
      if (cmd === 'cursor_goto' || cmd === 'put') { // TODO: request char from screen maybe?
        debouncedCharUnderCursor();
      }
    }
  } else if (method === 'vv:fullscreen') {
    currentWindow.setSimpleFullScreen(!!args[0]);
    currentWindow.webContents.focus();
  } else if (method === 'vv:char_under_cursor') {
    screen.vv_char_under_cursor(args);
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
  const newCoords = [
    Math.floor(event.clientX / charWidth()),
    Math.floor(event.clientY / charHeight()),
  ];
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
  console.log('select all');
  nvim.input('ggVG');
};

const closeWindow = async () => {
  await currentWindow.hide();
  await currentWindow.setSimpleFullScreen(false);
  currentWindow.close();
};

const initNvim = async () => {
  const { args, env, cwd } = currentWindow;

  const nvimProcess = spawn('nvim', ['--embed', ...args], {
    stdio: ['pipe', 'pipe', process.stderr],
    env,
    cwd,
  });

  nvim = await attach({ proc: nvimProcess });
  window.nvim = nvim;

  nvim.uiAttach(100, 50, { ext_cmdline: false });

  nvim.on('notification', (method, args) => {
    handleNotification(method, args);
  });

  nvim.on('disconnect', closeWindow);

  nvim.command('set mouse=a'); // Enable Mouse
  nvim.command('map <D-w> :q<CR>');
  nvim.command('map <D-q> :qa<CR>');

  nvim.command('command Fu call rpcnotify(0, "vv:fullscreen", 1)');
  nvim.command('command Nofu call rpcnotify(0, "vv:fullscreen", 0)');
  nvim.subscribe('vv:fullscreen');
  nvim.subscribe('vv:char_under_cursor');

  resize();

  document.addEventListener('keydown', handleKeydown);
  document.addEventListener('mousedown', handleMousedown);
  document.addEventListener('mouseup', handleMouseup);
  document.addEventListener('mousemove', handleMousemove);
  document.addEventListener('paste', handlePaste);
  document.addEventListener('copy', handleCopy);
  ipcRenderer.on('selectAll', handleSelectall);

  window.addEventListener('resize', handleResize);
};

document.addEventListener('DOMContentLoaded', initNvim);
