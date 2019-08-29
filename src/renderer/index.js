import debounce from 'lodash/debounce';

// import log from '../lib/log';

import nvim from './nvim/api';

import initScreen, { screenCoords } from './nvim/screen';

import initKeyboard from './nvim/input/keyboard';
import initMouse from './nvim/input/mouse';
import initInsertSymbols from './nvim/features/insertSymbols';

const {
  remote: {
    getCurrentWindow,
    screen: { getPrimaryDisplay },
  },
  ipcRenderer,
} = require('electron');

const currentWindow = getCurrentWindow();

let cols;
let rows;
let screen;

let uiAttached = false;

let windowLeft;
let windowTop;
let windowWidth;
let windowHeight;

const settings = {};

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

  bold: value => screen.vv_bold(value),
  italic: value => screen.vv_italic(value),
  underline: value => screen.vv_underline(value),
  undercurl: value => screen.vv_undercurl(value),
  fontfamily: value => screen.vv_fontfamily(value),
  fontsize: value => screen.vv_fontsize(value),
  lineheight: value => screen.vv_lineheight(value),
  letterspacing: value => screen.vv_letterspacing(value),
};

const updateSettings = (newSettings) => {
  Object.keys(newSettings).forEach(key => {
    settings[key] = newSettings[key];
    if (handleSet[key]) {
      handleSet[key](settings[key]);
    }
  });
  updateWindowSize();
};

const initRenderer = async (_event, settings) => {
  ({ x: windowLeft, y: windowTop, width: windowWidth, height: windowHeight} = currentWindow.getBounds())
  nvim.initApi();

  screen = initScreen('screen');

  initKeyboard();
  initMouse();
  initInsertSymbols();

  updateSettings(settings);

  ipcRenderer.on('updateSettings', (_e, settings) => updateSettings(settings));

  window.addEventListener('resize', debounce(resize, 100));
};

ipcRenderer.on('initRenderer', initRenderer);
