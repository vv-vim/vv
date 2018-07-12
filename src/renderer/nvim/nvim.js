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
import initReloadChanged from './features/reloadChanged';
import initCloseWindow from './features/closeWindow';
import initInsertSymbols from './features/insertSymbols';

import { hasStdioopen } from './../lib/nvimVersion';

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

let windowLeftOriginal = currentWindow.getPosition()[0];
let windowTopOriginal = currentWindow.getPosition()[1];
let windowLeft = windowLeftOriginal;
let windowTop = windowTopOriginal;
let windowWidth = currentWindow.getSize()[0];
let windowHeight = currentWindow.getSize()[1];

let noResize = false;
let uiAttached = false;

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

const handleResize = debounce(resize, 500);

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
    debouncedRedraw();
  },
  italic: (value) => {
    screen.vv_show_italic(value);
    debouncedRedraw();
  },
  underline: (value) => {
    screen.vv_show_underline(value);
    debouncedRedraw();
  },
  undercurl: (value) => {
    screen.vv_show_undercurl(value);
    debouncedRedraw();
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
  if (method === 'vv:set') {
    const [option, ...props] = args;
    if (handleSet[option]) {
      handleSet[option](...props);
    }
  } else if (
    !['redraw', 'vv:unsaved_buffers', 'vv:filename', 'vv:file_changed'].includes(method)
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
    await nvim.command(vvSourceCommand());
  }
};

const startNvimProcess = () => {
  const { args, env, cwd } = currentWindow;

  // With --embed we can't read startup errors and it blocks process.
  // With --headless we can do it, but to turn on rpc we need stdioopen
  // that works only since nvim 0.3.
  // So we use --headless + stdioopen if we can. Bad luck for nvim 0.2 users
  // if they have broken init.vim.
  const nvimArgs = hasStdioopen() ? [
    '--headless',
    '--cmd',
    vvSourceCommand(),
    '+call stdioopen({\'rpc\': v:true})',
    ...args,
  ] : [
    '--embed',
    '--cmd',
    vvSourceCommand(),
    ...args,
  ];

  const nvimProcess = spawn(
    'nvim',
    nvimArgs,
    { env, cwd },
  );

  // Pipe errors to std output and also send it in console as error.
  nvimProcess.stderr.pipe(process.stdout);

  let errorStr = '';
  nvimProcess.stderr.on('data', (data) => {
    errorStr += data.toString();
    debounce(() => {
      if (errorStr) console.error(errorStr); // eslint-disable-line no-console
      errorStr = '';
    }, 10)();
  });

  return nvimProcess;
};

const initNvim = async () => {
  ({ noResize } = currentWindow);

  const nvimProcess = startNvimProcess();
  nvim = await attach({ proc: nvimProcess });
  screen = initScreen('screen', nvim);

  nvim.on('notification', handleNotification);

  nvim.subscribe('vv:set');

  const { args } = currentWindow;
  await fixNoConfig(args, vvSourceCommand);

  initFullScreen(nvim);
  initZoom(nvim);
  initKeyboard(nvim);
  initMouse(nvim);
  initQuit(nvim);
  initCopyPaste(nvim);
  initWindowTitle(nvim);
  initReloadChanged(nvim);
  initCloseWindow(nvim);
  initInsertSymbols(nvim);

  await nvim.command('VVsettings');

  nvim.command('doautocmd <nomodeline> GUIEnter');

  ipcRenderer.on('leave-full-screen', () => {
    updateWindowSize();
    updateWindowPosition();
  });

  window.addEventListener('resize', handleResize);
};

document.addEventListener('DOMContentLoaded', initNvim);
