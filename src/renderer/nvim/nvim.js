import debounce from 'lodash/debounce';
import path from 'path';

import { spawn } from 'child_process';

import nvimCommand from '../../lib/nvimCommand';

import store from '../../lib/store';
// import log from '../../lib/log';
import shell from '../../lib/shell';

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

const { attach } = global.require('neovim'); // ~100 ms lost here
const {
  remote: { getCurrentWindow },
  screen: { getPrimaryDisplay },
} = require('electron');

const currentWindow = getCurrentWindow();
let nvim;
let cols;
let rows;
let screen;
let fullScreen;

let uiAttached = false;

const [windowLeftOriginal, windowTopOriginal] = currentWindow.getPosition();
let [windowWidth, windowHeight] = currentWindow.getSize();
let windowLeft = windowLeftOriginal;
let windowTop = windowTopOriginal;

// When you have existing window and open the new one, the new window will have the same size
// as existing and have top and left offset. We don't obey VVset width, height, left, top rules
// during startup in this case. This flag is used to ignore them, it is true on startup and
// changed to false after startup is finished.
let { noResize } = currentWindow;

let isWindowShown = false;

let apiInfo;

let newSettings = store.get('settings') || {};
const settings = {};
const defaultSettings = {
  fullscreen: 0,
  simplefullscreen: 1,
  bold: 1,
  italic: 1,
  underline: 1,
  undercurl: 1,
  fontfamily: 'monospace',
  fontsize: 12,
  lineheight: 1.25,
  letterspacing: 0,
  windowwidth: '60%',
  windowheight: '80%',
  windowleft: '50%',
  windowtop: '50%',
};

let debouncedShowWindow = () => {};

const resize = () => {
  const [newCols, newRows] = screenCoords(...currentWindow.getContentSize(), true);
  if (
    newCols > 0
    && newRows > 0
    && (newCols !== cols || newRows !== rows || !uiAttached)
  ) {
    cols = newCols;
    rows = newRows;

    if (uiAttached) {
      nvim.uiTryResize(cols, rows);
    } else {
      uiAttached = true;
      const uiOptions = {};
      if (apiInfo[1].ui_options.includes('ext_linegrid')) {
        uiOptions.ext_linegrid = true;
      }
      nvim.uiAttach(cols, rows, uiOptions);
    }
  }
};

const debouncedResize = debounce(resize, 100);

const showWindow = () => {
  if (!isWindowShown) {
    currentWindow.show();
    isWindowShown = true;
    noResize = false;
    nvim.command('doautocmd <nomodeline> GUIEnter');
    store.set('settings', settings);
    window.addEventListener('resize', debouncedResize);
  }
};

const updateWindowSize = () => {
  if (!settings.fullscreen) {
    const topOffset = Math.round(
      getPrimaryDisplay().bounds.height
        - getPrimaryDisplay().workAreaSize.height,
    );
    currentWindow.setBounds(
      {
        // 170ms
        x: windowLeft,
        y: windowTop + topOffset,
        width: windowWidth,
        height: windowHeight,
      },
      false,
    );
  }
  resize();
};

const handleSet = {
  windowwidth: (w) => {
    if (noResize) return;
    let width = parseInt(w, 10);
    if (w.toString().indexOf('%') !== -1) {
      width = Math.round(getPrimaryDisplay().workAreaSize.width * width / 100);
    }
    windowWidth = width;
    // handleSet.windowleft(windowLeftOriginal);
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
    // handleSet.windowtop(windowTopOriginal);
  },
  windowleft: (l) => {
    if (noResize) return;
    // windowLeftOriginal = l;
    let left = parseInt(l, 10);
    if (l.toString().indexOf('%') !== -1) {
      const displayWidth = getPrimaryDisplay().workAreaSize.width;
      const winWidth = windowWidth;
      left = Math.round((displayWidth - winWidth) * left / 100);
    }
    windowLeft = left;
  },
  windowtop: (t) => {
    if (noResize) return;
    // windowTopOriginal = t;
    let top = parseInt(t, 10);
    if (t.toString().indexOf('%') !== -1) {
      const displayHeight = getPrimaryDisplay().workAreaSize.height;
      const winHeight = windowHeight;
      top = Math.round((displayHeight - winHeight) * top / 100);
    }
    windowTop = top;
  },

  fullscreen: value => fullScreen.fullscreen(value),

  bold: value => screen.vv_bold(value),
  italic: value => screen.vv_italic(value),
  underline: value => screen.vv_underline(value),
  undercurl: value => screen.vv_undercurl(value),
  fontfamily: value => screen.vv_fontfamily(value),
  fontsize: value => screen.vv_fontsize(value),
  lineheight: value => screen.vv_lineheight(value),
  letterspacing: value => screen.vv_letterspacing(value),
};

const applyAllSettings = () => {
  let hasChanges = false;
  Object.keys(newSettings).forEach((key) => {
    if (settings[key] !== newSettings[key] && handleSet[key]) {
      handleSet[key](newSettings[key]);
      settings[key] = newSettings[key];
      hasChanges = true;
    }
  });

  if (hasChanges || Object.keys(newSettings).length === 0) {
    updateWindowSize();
  }
};

const debouncedApplyAllSettings = debounce(applyAllSettings, 10);

const handleNotification = async (method, params) => {
  if (method === 'vv:set') {
    const [option, props] = params;
    newSettings[option] = props;
    debouncedApplyAllSettings();
  } else if (method === 'redraw') {
    debouncedShowWindow();
  } else if (method === 'vv:vim_enter') {
    debouncedShowWindow = debounce(() => {
      debouncedShowWindow = () => {};
      showWindow();
    }, 10);
  } else if (
    !['vv:unsaved_buffers', 'vv:filename', 'vv:file_changed'].includes(method)
  ) {
    console.warn('Unknown notification', method, params); // eslint-disable-line no-console
  }
};

const vvSourceCommand = () => `source ${path.join(currentWindow.resourcesPath, 'bin/vv.vim')}`;

// Source vv specific ext on -u NONE
const fixNoConfig = (args) => {
  const uFlagIndex = args.indexOf('-u');
  if (uFlagIndex !== -1 && args[uFlagIndex + 1] === 'NONE') {
    nvim.command(vvSourceCommand());
  }
};

const startNvimProcess = ({ cwd, args }) => {
  const nvimArgs = ['--embed', '--cmd', vvSourceCommand(), ...args];

  const nvimProcess = spawn(
    nvimCommand(),
    nvimArgs.map(arg => `'${arg.replace(/'/g, "'\\''")}'`), // Escaping is broken with shell
    { cwd, shell }, // exec through shell is required to have correct env variables (ex. PATH)
  );

  // Pipe errors to std output and also send it in console as error.
  let errorStr = '';
  nvimProcess.stderr.pipe(process.stdout);
  nvimProcess.stderr.on('data', (data) => {
    errorStr += data.toString();
    debounce(() => {
      if (errorStr) console.error(errorStr); // eslint-disable-line no-console
      errorStr = '';
    }, 10)();
  });

  // nvimProcess.stdout.on('data', (data) => {
  //   console.log(data.toString());
  // });

  return nvimProcess;
};

const initNvim = async () => {
  const { args, cwd } = currentWindow;

  const proc = startNvimProcess({ args, cwd });
  nvim = await attach({ proc });

  nvim.on('notification', handleNotification);
  nvim.subscribe('vv:set');
  nvim.subscribe('vv:vim_enter');
  apiInfo = await nvim.apiInfo;

  screen = initScreen('screen', nvim);
  fullScreen = initFullScreen(nvim);

  applyAllSettings();
  newSettings = defaultSettings;

  fixNoConfig(args);

  // If nvim has startup errors or swapfile warning it will not trigger VimEnter
  // until user action. If that happens, show window anyway.
  setTimeout(showWindow, 2000);

  initZoom(nvim);
  initKeyboard(nvim);
  initMouse(nvim);
  initQuit(nvim);
  initCopyPaste(nvim);
  initWindowTitle(nvim);
  initCloseWindow(nvim);
  initInsertSymbols(nvim);
  initReloadChanged(nvim);
};

document.addEventListener('DOMContentLoaded', initNvim);
