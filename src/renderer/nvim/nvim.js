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

const { spawn } = global.require('child_process');
const { attach } = global.require('neovim');
const { remote: { getCurrentWindow } } = global.require('electron');

const currentWindow = getCurrentWindow();
let nvim;
let cols;
let rows;
let screen;

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

// const boolValue = value => !!parseInt(value, 10);
const handleSet = {
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
  } else if (!['vv:unsaved_buffers', 'vv:filename', 'vv:file_changed'].includes(method)) {
    console.warn('Unknown notification', method, args); // eslint-disable-line no-console
  }
};

const vvSourceCommand = () => `source ${path.join(currentWindow.resourcesPath, 'bin/vv.vim')}`;

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

  const {
    args, env, cwd,
  } = currentWindow;


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

  await nvim.command('VVsettings');

  [cols, rows] = screenCoords(window.innerWidth, window.innerHeight);
  await nvim.uiAttach(cols, rows, {});

  nvim.command('doautocmd <nomodeline> GUIEnter');

  window.addEventListener('resize', handleResize);
};

document.addEventListener('DOMContentLoaded', initNvim);
