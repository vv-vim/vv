import debounce from 'lodash/debounce';

import store from '../lib/store';
// import log from '../lib/log';

import nvim from './nvim/api';

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

let windowLeft;
let windowTop;
let windowWidth;
let windowHeight;

let isWindowShown = false;

// Store initial settings to make window open faster. When window is shown current settings are
// stored to initialSettings. And next time when new window is created we use these settings by
// default and change it if settings from vim config are changed.
let newSettings = store.get('initialSettings') || {};
let initialSettings;
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
};

let debouncedShowWindow = () => {};

const resize = () => {
  const [newCols, newRows] = screenCoords(...currentWindow.getContentSize(), true);
  if (newCols > 0 && newRows > 0 && (newCols !== cols || newRows !== rows || !uiAttached)) {
    cols = newCols;
    rows = newRows;

    if (uiAttached) {
      nvim.uiTryResize(cols, rows);
    } else {
      uiAttached = true;
      nvim.uiAttach(cols, rows, { ext_linegrid: true });
    }
  }
};

const debouncedResize = debounce(resize, 100);

const showWindow = () => {
  if (!isWindowShown) {
    currentWindow.show();
    isWindowShown = true;
    nvim.command('doautocmd <nomodeline> GUIEnter');
    store.set('initialSettings', initialSettings);
    window.addEventListener('resize', debouncedResize);
  }
};

const updateWindowSize = () => {
  if (!settings.fullscreen) {
    currentWindow.setBounds(
      {
        x: windowLeft,
        y: windowTop,
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
    let width = parseInt(w, 10);
    if (w.toString().indexOf('%') !== -1) {
      width = Math.round((getPrimaryDisplay().workAreaSize.width * width) / 100);
    }
    windowWidth = width;
  },
  windowheight: h => {
    let height = parseInt(h, 10);
    if (h.toString().indexOf('%') !== -1) {
      height = Math.round((getPrimaryDisplay().workAreaSize.height * height) / 100);
    }
    windowHeight = height;
  },
  windowleft: l => {
    let left = parseInt(l, 10);
    if (l.toString().indexOf('%') !== -1) {
      const displayWidth = getPrimaryDisplay().workAreaSize.width;
      const winWidth = windowWidth;
      left = Math.round(((displayWidth - winWidth) * left) / 100);
    }
    windowLeft = left;
  },
  windowtop: t => {
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

  if (!isWindowShown && initialSettings) {
    initialSettings = {
      ...initialSettings,
      ...newSettings,
    }
  }

  if (hasChanges || Object.keys(newSettings).length === 0) {
    updateWindowSize();
  }
  newSettings = {};
};

const debouncedApplyAllSettings = debounce(applyAllSettings, 10);

const applySetting = ([option, props]) => {
  if (props !== null) {
    newSettings[option] = props;
    debouncedApplyAllSettings();
  }
}

const vimEnter = () => {
  // TODO: refactor this part
  debouncedShowWindow = debounce(() => {
    debouncedShowWindow = () => {};
    showWindow();
  }, 10);
}

const initNvim = async (_event, { args, cwd, env, resourcesPath }) => {
  ({ x: windowLeft, y: windowTop, width: windowWidth, height: windowHeight} = currentWindow.getBounds())
  nvim.initApi({ args, cwd, env, resourcesPath });

  await nvim.send('subscribe', 'vv:vim_enter');
  nvim.on('vv:vim_enter', vimEnter);
  nvim.on('vv:set', applySetting);
  nvim.on('redraw', () => debouncedShowWindow());

  screen = initScreen('screen');
  fullScreen = initFullScreen();

  applyAllSettings();
  initialSettings = {};
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

ipcRenderer.on('initNvim', initNvim);
