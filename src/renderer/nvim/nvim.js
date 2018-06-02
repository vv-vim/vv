import throttle from 'lodash/throttle';
import debounce from 'lodash/debounce';
import path from 'path';
import fs from 'fs';

import initScreen, { screenCoords } from './screen';
import keyboard from './keyboard';
import mouse from './mouse';
import menu from './menu';

const { spawn } = global.require('child_process');
const { attach } = global.require('neovim');
const { remote: { getCurrentWindow, dialog }, ipcRenderer } = global.require('electron');

const currentWindow = getCurrentWindow();
let nvim;
let cols;
let rows;
let screen;
let simpleFullScreen = true;
let unsavedBuffers = [];
let shouldClose = false;

const charUnderCursor = () => {
  nvim.command('VVcharUnderCursor');
};

const debouncedCharUnderCursor = debounce(charUnderCursor, 10);

const setTitle = (title) => {
  currentWindow.setTitle(title);
};

const setFilename = (filename) => {
  if (fs.existsSync(filename)) {
    currentWindow.setRepresentedFilename(filename);
  }
};


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
      if (cmd === 'set_title') {
        setTitle(props[0][0]);
      }
    }
  } else if (method === 'vv:set') {
    const [option, ...props] = args;
    if (handleSet[option]) {
      handleSet[option](...props);
    }
  } else if (method === 'vv:char_under_cursor') {
    screen.vv_char_under_cursor(...args);
  } else if (method === 'vv:filename') {
    setFilename(args[0]);
  } else if (method === 'vv:unsaved_buffers') {
    [unsavedBuffers] = args;
  } else {
    console.warn('Unknown notification', method, args); // eslint-disable-line no-console
  }
};

const handleDisconnect = async () => {
  await currentWindow.hide();
  await currentWindow.setSimpleFullScreen(false);
  unsavedBuffers = [];
  shouldClose = true;
  currentWindow.close();
};

const showCloseDialog = async () => {
  await nvim.command('VVunsavedBuffers');
  if (unsavedBuffers.length === 0) {
    nvim.command('qa');
  } else {
    const response = dialog.showMessageBox(
      currentWindow,
      {
        message: `You have ${unsavedBuffers.length} unsaved buffers. Do you want to save them?`,
        detail: `${unsavedBuffers.map(b => b.name).join('\n')}\n`,
        cancelId: 2,
        defaultId: 0,
        buttons: ['Save All', 'Discard All', 'Cancel'],
      },
    );
    if (response === 0) {
      await nvim.command('xa'); // Save All
    } else if (response === 1) {
      await nvim.command('qa!'); // Discard All
    }
    await nvim.command('VVunsavedBuffers');
    if (unsavedBuffers.length !== 0) {
      ipcRenderer.send('cancel-quit');
    }
  }
};

const handleClose = (e) => {
  if (!shouldClose) {
    showCloseDialog();
    e.returnValue = false;
  }
};

const handleQuit = () => {
  window.close();
};

const initNvim = async () => {
  screen = initScreen('screen');

  const {
    args, env, cwd, resourcesPath,
  } = currentWindow;

  const nvimProcess = spawn(
    'nvim',
    ['--embed', '--cmd', `source ${path.join(resourcesPath, 'bin/vv.vim')}`, ...args],
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

  nvim.on('disconnect', handleDisconnect);

  nvim.subscribe('vv:set');
  nvim.subscribe('vv:char_under_cursor');
  nvim.subscribe('vv:filename');
  nvim.subscribe('vv:unsaved_buffers');

  const uFlagIndex = args.indexOf('-u');
  if (uFlagIndex !== -1 && args[uFlagIndex + 1] === 'NONE') {
    await nvim.command('hi Normal guifg=black guibg=white');
    await nvim.command(`source ${path.join(resourcesPath, 'bin/vv.vim')}`);
  }

  await nvim.command('VVsettings');

  [cols, rows] = screenCoords(window.innerWidth, window.innerHeight);

  await nvim.uiAttach(cols, rows, {});
  nvim.command('doautocmd <nomodeline> GUIEnter');

  // title and filename don't fire on startup, doing it manually
  nvim.command('set title');
  nvim.command('call rpcnotify(0, "vv:filename", expand("%:p"))');

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
  ipcRenderer.on('quit', handleQuit);

  window.addEventListener('resize', handleResize);

  window.addEventListener('beforeunload', handleClose);
};

document.addEventListener('DOMContentLoaded', initNvim);
