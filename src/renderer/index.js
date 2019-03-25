import debounce from 'lodash/debounce';

import store from '../lib/store';
// import log from '../lib/log';

import { initApi, nvim } from './nvim/api';

import initScreen, { screenCoords } from './nvim/screen';

import initKeyboard from './nvim/input/keyboard';
import initMouse from './nvim/input/mouse';

import initQuit from './nvim/features/quit';
import initCopyPaste from './nvim/features/copyPaste';
import initFullScreen from './nvim/features/fullScreen';
import initZoom from './nvim/features/zoom';
import initWindowTitle from './nvim/features/windowTitle';
import initReloadChanged from './nvim/features/reloadChanged';
import initCloseWindow from './nvim/features/closeWindow';
import initInsertSymbols from './nvim/features/insertSymbols';

const {
  remote: { getCurrentWindow },
  screen: { getPrimaryDisplay },
  ipcRenderer,
} = require('electron');

const currentWindow = getCurrentWindow();

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
  if (newCols > 0 && newRows > 0 && (newCols !== cols || newRows !== rows || !uiAttached)) {
    cols = newCols;
    rows = newRows;

    if (uiAttached) {
      nvim().uiTryResize(cols, rows);
    } else {
      uiAttached = true;
      nvim().uiAttach(cols, rows, { ext_linegrid: true });
    }
  }
};

const debouncedResize = debounce(resize, 100);

const showWindow = () => {
  if (!isWindowShown) {
    currentWindow.show();
    isWindowShown = true;
    noResize = false;
    nvim().command('doautocmd <nomodeline> GUIEnter');
    store.set('settings', settings);
    window.addEventListener('resize', debouncedResize);
  }
};

const updateWindowSize = () => {
  if (!settings.fullscreen) {
    const topOffset = Math.round(
      getPrimaryDisplay().bounds.height - getPrimaryDisplay().workAreaSize.height,
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
  windowwidth: w => {
    if (noResize) return;
    let width = parseInt(w, 10);
    if (w.toString().indexOf('%') !== -1) {
      width = Math.round((getPrimaryDisplay().workAreaSize.width * width) / 100);
    }
    windowWidth = width;
    // handleSet.windowleft(windowLeftOriginal);
  },
  windowheight: h => {
    if (noResize) return;
    let height = parseInt(h, 10);
    if (h.toString().indexOf('%') !== -1) {
      height = Math.round((getPrimaryDisplay().workAreaSize.height * height) / 100);
    }
    windowHeight = height;
    // handleSet.windowtop(windowTopOriginal);
  },
  windowleft: l => {
    if (noResize) return;
    // windowLeftOriginal = l;
    let left = parseInt(l, 10);
    if (l.toString().indexOf('%') !== -1) {
      const displayWidth = getPrimaryDisplay().workAreaSize.width;
      const winWidth = windowWidth;
      left = Math.round(((displayWidth - winWidth) * left) / 100);
    }
    windowLeft = left;
  },
  windowtop: t => {
    if (noResize) return;
    // windowTopOriginal = t;
    let top = parseInt(t, 10);
    if (t.toString().indexOf('%') !== -1) {
      const displayHeight = getPrimaryDisplay().workAreaSize.height;
      const winHeight = windowHeight;
      top = Math.round(((displayHeight - winHeight) * top) / 100);
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
  Object.keys(newSettings).forEach(key => {
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

const handleNotification = (method, params) => {
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
  } else if (!['vv:unsaved_buffers', 'vv:filename', 'vv:file_changed'].includes(method)) {
    console.warn('Unknown notification', method, params); // eslint-disable-line no-console
  }
};

const initNvim = async ({ args, cwd, resourcesPath }) => {
  await initApi({ args, cwd, resourcesPath });

  nvim().on('notification', handleNotification);
  nvim().subscribe('vv:set');
  nvim().subscribe('vv:vim_enter');

  screen = initScreen('screen');
  fullScreen = initFullScreen();

  applyAllSettings();
  newSettings = defaultSettings;

  // If nvim has startup errors or swapfile warning it will not trigger VimEnter
  // until user action. If that happens, show window anyway.
  setTimeout(showWindow, 2000);

  initZoom();
  initKeyboard();
  initMouse();
  initCopyPaste();
  initWindowTitle();
  initCloseWindow();
  initQuit();
  initInsertSymbols();
  initReloadChanged();
};

ipcRenderer.on('initNvim', (_event, props) => {
  initNvim(props);
});
