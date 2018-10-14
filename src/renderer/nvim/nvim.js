import debounce from 'lodash/debounce';
import path from 'path';

import nvimCommand from '../../lib/nvimCommand';

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

import { hasStdioopen, hasNewEmbedAPI } from '../lib/nvimVersion';

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

// When you have existing window and open the new one, the new window will have the same size
// as existing and have top and left offset. We don't obey VVset width, height, left, top rules
// during startup in this case. This flag is used to ignore them, it is true on startup and
// changed to false after startup is finished.
let noResize = false;

let isWindowShown = false;

const resize = async (forceRedraw = false) => {
  const [newCols, newRows] = screenCoords(
    window.innerWidth,
    window.innerHeight,
  );
  if (
    isWindowShown
    && newCols > 0
    && newRows > 0
    && (newCols !== cols || newRows !== rows || forceRedraw)
  ) {
    cols = newCols;
    rows = newRows;

    await nvim.uiTryResize(cols, rows);
  }
};

const uiAttach = async () => {
  [cols, rows] = screenCoords(window.innerWidth, window.innerHeight);
  await nvim.uiAttach(cols, rows, {});
};

const handleResize = debounce(resize, 300);

const redraw = () => resize(true);
const debouncedRedraw = debounce(redraw, 10);

const updateWindowSize = () => {
  if (!currentWindow.isFullScreen() && !currentWindow.isSimpleFullScreen()) {
    currentWindow.setSize(windowWidth, windowHeight);
  }
};

const debouncedUpdateWindowSize = debounce(updateWindowSize, 10);

const updateWindowPosition = () => {
  if (!currentWindow.isFullScreen() && !currentWindow.isSimpleFullScreen()) {
    const topOffset = Math.round(
      getPrimaryDisplay().bounds.height
        - getPrimaryDisplay().workAreaSize.height,
    );
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
      height = Math.round(
        getPrimaryDisplay().workAreaSize.height * height / 100,
      );
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

const vimEnter = async () => {
  if (isWindowShown) return;
  isWindowShown = true;
  noResize = false;
  await resize();
  setTimeout(currentWindow.show, 50);
  nvim.command('doautocmd <nomodeline> GUIEnter');
};

const handleNotification = async (method, args) => {
  if (method === 'vv:set') {
    const [option, ...props] = args;
    if (handleSet[option]) {
      handleSet[option](...props);
    }
  } else if (method === 'vv:vim_enter') {
    vimEnter();
  } else if (
    ![
      'redraw',
      'vv:unsaved_buffers',
      'vv:filename',
      'vv:file_changed',
    ].includes(method)
  ) {
    console.warn('Unknown notification', method, args); // eslint-disable-line no-console
  }
};

const vvSourceCommand = () => `source ${path.join(currentWindow.resourcesPath, 'bin/vv.vim')}`;

// Source vv specific ext on -u NONE
const fixNoConfig = async () => {
  const { args } = currentWindow;
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
  // So we use --headless + stdioopen if we can.
  // Starting from 0.3.2 it has different --embed API that is not blocked by startup errors,
  // so it is safe to use --embed again.
  const nvimArgs = hasStdioopen() && !hasNewEmbedAPI()
    ? [
      '--headless',
      '--cmd',
      vvSourceCommand(),
      "+call stdioopen({'rpc': v:true})",
      ...args,
    ]
    : ['--embed', '--cmd', vvSourceCommand(), ...args];

  const nvimProcess = spawn(nvimCommand(), nvimArgs, { env, cwd });

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

  nvim = await attach({ proc: startNvimProcess() });

  screen = initScreen('screen', nvim);

  nvim.on('notification', handleNotification);
  nvim.subscribe('vv:set');
  nvim.subscribe('vv:vim_enter');

  await uiAttach();
  await fixNoConfig();

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

  ipcRenderer.on('leave-full-screen', () => {
    updateWindowSize();
    updateWindowPosition();
  });

  // If VimEnter did not fired for some reason, show window anyway
  setTimeout(() => {
    if (isWindowShown) return;
    vimEnter();
    currentWindow.show();
  }, 1000);

  if (!hasNewEmbedAPI()) {
    await nvim.command('VVsettings');
  }

  window.addEventListener('resize', handleResize);
};

document.addEventListener('DOMContentLoaded', initNvim);
