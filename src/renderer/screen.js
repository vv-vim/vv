import debounce from 'lodash/debounce';
import throttle from 'lodash/throttle';
import isFinite from 'lodash/isFinite';
import isEqual from 'lodash/isEqual';

import * as PIXI from './lib/pixi';

import { remote, ipcRenderer } from './preloaded/electron';

import nvim from './nvim';

import getColor from '../lib/getColor';

// import log from './../lib/log';

const [body] = document.getElementsByTagName('body');

let screenContainer;

let cursorEl;
let cursorPosition = [0, 0];
let cursorChar;

let startCursorBlinkOnTimeout;
let startCursorBlinkOffTimeout;
let blinkOnCursorBlinkInterval;
let blinkOffCursorBlinkInterval;

let screenEl;

let scale;
let charWidth;
let charHeight;

let fontFamily = 'monospace';
let fontSize = 12;
let lineHeight = 1.25;
let letterSpacing = 0;

const defaultFgColor = 'rgb(255,255,255)';
const defaultBgColor = 'rgb(0,0,0)';
const defaultSpColor = 'rgb(255,255,255)';

let cols;
let rows;

let modeInfoSet;
let mode;

let showBold = true;
let showItalic = true;
let showUnderline = true;
let showUndercurl = true;

const charCanvas = new OffscreenCanvas(1, 1);
const charCtx = charCanvas.getContext('2d', { alpha: true });

const currentWindow = remote.getCurrentWindow();

const chars = {};

const highlightTable = {
  '0': {
    calculated: {
      bgColorNum: 0x000000,
      bgColor: defaultBgColor,
      fgColor: defaultFgColor,
      spColor: defaultSpColor,
      hiItalic: false,
      hiBold: false,
      hiUnderline: false,
      hiUndercurl: false,
    },
  },
  // Inverted default color for cursor
  '-1': {
    calculated: {
      bgColorNum: 0xffffff,
      bgColor: defaultFgColor,
      fgColor: defaultBgColor,
      spColor: defaultSpColor,
      hiItalic: false,
      hiBold: false,
      hiUnderline: false,
      hiUndercurl: false,
    },
  },
};

// WebGL
let stage;
let renderer;
let charsContainer;
let bgContainer;
let cursorContainer;
let cursorSprite;
let cursorBg;

let needRerender = false;
const TARGET_FPS = 60;

export const getCursorElement = () => cursorEl;

const windowPixelSize = () => ({
  width: window.screen.width * window.devicePixelRatio,
  height: window.screen.height * window.devicePixelRatio,
});

const initCursor = () => {
  cursorEl = document.createElement('div');
  cursorEl.style.position = 'absolute';
  cursorEl.style.zIndex = 100;
  cursorEl.style.top = 0;
  cursorEl.style.left = 0;
  screenEl.appendChild(cursorEl);
};

const initScreen = () => {
  screenContainer = document.getElementById('screen');

  screenContainer.style.position = 'absolute';
  screenContainer.style.transformOrigin = '0 0';

  screenEl = document.createElement('div');

  screenEl.style.contain = 'strict';
  screenEl.style.overflow = 'hidden';

  // Init WebGL for text
  const pixi = new PIXI.Application({
    transparent: true,
    autostart: false,
    ...windowPixelSize(),
  });

  screenEl.appendChild(pixi.view);

  screenContainer.appendChild(screenEl);

  ({ stage, renderer } = pixi);
  pixi.ticker.stop();
  stage.interactiveChildren = false;

  charsContainer = new PIXI.Container();
  bgContainer = new PIXI.Container();
  cursorContainer = new PIXI.Container();
  cursorSprite = new PIXI.Sprite();
  cursorBg = new PIXI.Graphics();

  stage.addChild(bgContainer);
  stage.addChild(charsContainer);
  stage.addChild(cursorContainer);
  cursorContainer.addChild(cursorBg);
  cursorContainer.addChild(cursorSprite);

  // Init screen for background
  screenEl.style.width = `${windowPixelSize().width}px`;
  screenEl.style.height = `${windowPixelSize().width}px`;
};

const RETINA_SCALE = 2;

const isRetina = () => window.devicePixelRatio === RETINA_SCALE;

const scaledLetterSpacing = () => {
  if (isRetina() || letterSpacing === 0) {
    return letterSpacing;
  }
  return letterSpacing > 0
    ? Math.floor(letterSpacing / RETINA_SCALE)
    : Math.ceil(letterSpacing / RETINA_SCALE);
};

const scaledFontSize = () => fontSize * scale;

const measureCharSize = () => {
  const char = document.createElement('span');
  char.innerHTML = '0';
  char.style.fontFamily = fontFamily;
  char.style.fontSize = `${scaledFontSize()}px`;
  char.style.lineHeight = `${Math.round(scaledFontSize() * lineHeight)}px`;
  char.style.position = 'absolute';
  char.style.left = '-1000px';
  char.style.top = 0;
  screenEl.appendChild(char);

  const oldCharWidth = charWidth;
  const oldCharHeight = charHeight;
  charWidth = char.offsetWidth + scaledLetterSpacing();
  charHeight = char.offsetHeight;
  if (oldCharWidth !== charWidth || oldCharHeight !== charHeight) {
    cursorSprite.x = -charWidth;
    cursorEl.style.width = `${charWidth}px`;
    cursorEl.style.height = `${charHeight}px`;

    if (charCanvas) {
      charCanvas.width = charWidth * 3;
      charCanvas.height = charHeight;
    }

    PIXI.utils.clearTextureCache();
  }
  screenEl.removeChild(char);
};

const font = (p) =>
  [p.hiItalic ? 'italic' : '', p.hiBold ? 'bold' : '', `${scaledFontSize()}px`, fontFamily].join(
    ' ',
  );

const getCharBitmap = (char, props) => {
  charCtx.fillStyle = props.fgColor;
  charCtx.font = font(props);
  charCtx.textAlign = 'left';
  charCtx.textBaseline = 'middle';
  if (char) {
    charCtx.fillText(
      char,
      Math.round(scaledLetterSpacing() / 2) + charWidth,
      Math.round(charHeight / 2),
    );
  }

  if (props.hiUnderline) {
    charCtx.strokeStyle = props.fgColor;
    charCtx.lineWidth = scale;
    charCtx.beginPath();
    charCtx.moveTo(charWidth, charHeight - scale);
    charCtx.lineTo(charWidth * 2, charHeight - scale);
    charCtx.stroke();
  }

  if (props.hiUndercurl) {
    charCtx.strokeStyle = props.spColor;
    charCtx.lineWidth = scaledFontSize() * 0.08;
    const x = charWidth;
    const y = charHeight - (scaledFontSize() * 0.08) / 2;
    const h = charHeight * 0.2; // Height of the wave
    charCtx.beginPath();
    charCtx.moveTo(x, y);
    charCtx.bezierCurveTo(x + x / 4, y, x + x / 4, y - h / 2, x + x / 2, y - h / 2);
    charCtx.bezierCurveTo(x + (x / 4) * 3, y - h / 2, x + (x / 4) * 3, y, x + x, y);
    charCtx.stroke();
  }

  return charCanvas.transferToImageBitmap();
};

const getCharTexture = (char, hlId) => {
  const key = `${char}:${hlId}`;
  if (!PIXI.utils.TextureCache[key]) {
    const props = highlightTable[hlId].calculated;
    PIXI.Texture.addToCache(PIXI.Texture.from(getCharBitmap(char, props)), key);
  }
  return PIXI.Texture.from(key);
};

const printChar = (i, j, char, hlId) => {
  if (!chars[i]) chars[i] = {};
  if (!chars[i][j]) chars[i][j] = {};
  if (!chars[i][j].sprite) {
    chars[i][j].sprite = new PIXI.Sprite();
    chars[i][j].bg = new PIXI.Graphics();
    charsContainer.addChild(chars[i][j].sprite);
    bgContainer.addChild(chars[i][j].bg);
  }

  // Print char
  chars[i][j].char = char;
  chars[i][j].hlId = hlId;
  chars[i][j].sprite.texture = getCharTexture(char, hlId);
  chars[i][j].sprite.position.set((j - 1) * charWidth, i * charHeight);
  chars[i][j].sprite.visible = true;

  // Draw bg
  chars[i][j].bg.position.set(j * charWidth, i * charHeight);
  if (hlId !== 0 && highlightTable[hlId].calculated.bgNum) {
    chars[i][j].bg.clear();
    chars[i][j].bg.beginFill(highlightTable[hlId].calculated.bgNum);
    if (j === cols - 1) {
      chars[i][j].bg.drawRect(0, 0, charWidth * 2, charHeight);
    } else {
      chars[i][j].bg.drawRect(0, 0, charWidth, charHeight);
    }
    chars[i][j].bg.visible = true;
  } else {
    chars[i][j].bg.visible = false;
  }
};

const cursorBlinkOn = () => {
  cursorContainer.visible = true;
  renderer.render(stage);
};

const cursorBlinkOff = () => {
  cursorContainer.visible = false;
  renderer.render(stage);
};

const cursorBlink = ({ blinkon, blinkoff, blinkwait } = {}) => {
  cursorContainer.visible = true;

  if (startCursorBlinkOnTimeout) clearTimeout(startCursorBlinkOnTimeout);
  if (startCursorBlinkOffTimeout) clearTimeout(startCursorBlinkOffTimeout);
  if (blinkOnCursorBlinkInterval) clearInterval(blinkOnCursorBlinkInterval);
  if (blinkOffCursorBlinkInterval) clearInterval(blinkOffCursorBlinkInterval);

  startCursorBlinkOnTimeout = null;
  startCursorBlinkOffTimeout = null;
  blinkOnCursorBlinkInterval = null;
  blinkOffCursorBlinkInterval = null;

  if (blinkoff && blinkon) {
    startCursorBlinkOffTimeout = setTimeout(() => {
      cursorBlinkOff();
      blinkOffCursorBlinkInterval = setInterval(cursorBlinkOff, blinkoff + blinkon);

      startCursorBlinkOnTimeout = setTimeout(() => {
        cursorBlinkOn();
        blinkOnCursorBlinkInterval = setInterval(cursorBlinkOn, blinkoff + blinkon);
      }, blinkoff);
    }, blinkwait);
  }
};

const clearCursor = () => {
  cursorBg.clear();
  cursorSprite.visible = false;
};

const redrawCursor = () => {
  const m = modeInfoSet && modeInfoSet[mode];
  cursorBlink(m);

  if (!m) return;
  // TODO: check if cursor changed (char, hlId, etc)
  clearCursor();

  const hlId = m.attr_id === 0 ? -1 : m.attr_id;
  cursorBg.beginFill(highlightTable[hlId].calculated.bgNum);

  if (m.cursor_shape === 'block') {
    cursorChar = chars[cursorPosition[0]][cursorPosition[1]].char || ' ';
    cursorSprite.texture = getCharTexture(cursorChar, hlId);
    cursorBg.drawRect(0, 0, charWidth, charHeight);
    cursorSprite.visible = true;
  } else if (m.cursor_shape === 'vertical') {
    const curWidth = m.cell_percentage
      ? Math.max(scale, Math.round((charWidth / 100) * m.cell_percentage))
      : scale;
    cursorBg.drawRect(0, 0, curWidth, charHeight);
  } else if (m.cursor_shape === 'horizontal') {
    const curHeight = m.cell_percentage
      ? Math.max(scale, Math.round((charHeight / 100) * m.cell_percentage))
      : scale;
    cursorBg.drawRect(0, charHeight - curHeight, charWidth, curHeight);
  }
  needRerender = true;
};

let debouncedRepositionCursor;

export const repositionCursor = (newCursor) => {
  if (debouncedRepositionCursor) debouncedRepositionCursor.cancel();
  if (newCursor) cursorPosition = newCursor;
  const left = cursorPosition[1] * charWidth;
  const top = cursorPosition[0] * charHeight;
  cursorContainer.position.set(left, top);
  cursorEl.style.transform = `translate(${left}px, ${top}px)`;
  redrawCursor();
};

debouncedRepositionCursor = debounce(repositionCursor, 10);

const optionSet = {
  guifont: (newFont) => {
    const [newFontFamily, newFontSize] = newFont.trim().split(':h');
    if (newFontFamily && newFontFamily !== '') {
      nvim.command(`VVset fontfamily=${newFontFamily}`);
      if (newFontSize && newFontFamily !== '') {
        nvim.command(`VVset fontsize=${newFontSize}`);
      }
    }
  },
};

const reprintAllChars = debounce(() => {
  body.style.background = highlightTable[0].calculated.bgColor;
  currentWindow.setBackgroundColor(highlightTable[0].calculated.bgColor);

  PIXI.utils.clearTextureCache();
  for (let i = 0; i <= rows; i += 1) {
    if (!chars[i]) chars[i] = {};
    for (let j = 0; j <= cols; j += 1) {
      if (!chars[i][j]) chars[i][j] = {};
      if (chars[i][j].char && isFinite(chars[i][j].hlId)) {
        printChar(i, j, chars[i][j].char, chars[i][j].hlId);
      }
    }
  }
  needRerender = true;
}, 10);

const recalculateHighlightTable = () => {
  Object.keys(highlightTable).forEach((id) => {
    if (id > 0) {
      const {
        foreground,
        background,
        special,
        reverse,
        standout,
        italic,
        bold,
        underline,
        undercurl,
      } = highlightTable[id].value;
      const r = reverse || standout;
      const fg = getColor(foreground, highlightTable[0].calculated.fgColor);
      const bg = getColor(background, highlightTable[0].calculated.bgColor);
      const sp = getColor(special, highlightTable[0].calculated.spColor);

      highlightTable[id].calculated = {
        fgColor: r ? bg : fg,
        bgColor: r ? fg : bg,
        spColor: sp,
        bgNum: r ? foreground : background,
        hiItalic: showItalic && italic,
        hiBold: showBold && bold,
        hiUnderline: showUnderline && underline,
        hiUndercurl: showUndercurl && undercurl,
      };
    }
  });
  reprintAllChars();
};

// https://github.com/neovim/neovim/blob/master/runtime/doc/ui.txt
const redrawCmd = {
  set_title: () => {},
  set_icon: () => {},

  mode_info_set: (props) => {
    modeInfoSet = props[0][1].reduce((r, o) => ({ ...r, [o.name]: o }), {});
    redrawCursor();
  },

  option_set: (options) => {
    options.forEach(([option, value]) => {
      if (optionSet[option]) {
        optionSet[option](value);
      } else {
        // console.warn('Unknown option', option, value); // eslint-disable-line no-console
      }
    });
  },

  mode_change: (modes) => {
    [mode] = modes[modes.length - 1];
    redrawCursor();
  },

  mouse_on: () => {},
  mouse_off: () => {},

  busy_start: () => {},
  busy_stop: () => {},

  suspend: () => {},

  update_menu: () => {},

  bell: () => {},
  visual_bell: () => {},

  hl_group_set: () => {},

  flush: throttle(() => {
    if (needRerender) {
      needRerender = false;
      renderer.render(stage);
    }
  }, 1000 / TARGET_FPS),

  // New api
  grid_resize: (props) => {
    cols = props[0][1];
    rows = props[0][2];

    if (cols * charWidth > renderer.width || rows * charHeight > renderer.height) {
      // Add extra column on the right to fill it with adjacent color to have a nice right border
      const width = (cols + 1) * charWidth;
      const height = rows * charHeight;

      screenEl.style.width = `${width}px`;
      screenEl.style.height = `${height}px`;

      renderer.resize(width, height);
      needRerender = true;
    }
  },

  default_colors_set: (props) => {
    const [foreground, background, special] = props[props.length - 1];

    const calculated = {
      bgColor: getColor(background, defaultBgColor),
      fgColor: getColor(foreground, defaultFgColor),
      spColor: getColor(special, defaultSpColor),
      hiItalic: false,
      hiBold: false,
      hiUnderline: false,
      hiUndercurl: false,
    };
    if (!highlightTable[0] || !isEqual(highlightTable[0].calculated, calculated)) {
      highlightTable[0] = { calculated };
      highlightTable[-1] = {
        calculated: {
          ...calculated,
          bgNum: foreground,
          bgColor: getColor(foreground, defaultFgColor),
          fgColor: getColor(background, defaultBgColor),
        },
      };
      recalculateHighlightTable();
    }
  },

  hl_attr_define: (props) => {
    props.forEach(([id, value]) => {
      highlightTable[id] = {
        value,
      };
    });
    recalculateHighlightTable();
  },

  grid_line: (props) => {
    for (let gridKey = 0, gridLength = props.length; gridKey < gridLength; gridKey += 1) {
      const row = props[gridKey][1];
      const col = props[gridKey][2];
      const cells = props[gridKey][3];

      let lineLength = 0;
      let currentHlId;

      for (let cellKey = 0, cellsLength = cells.length; cellKey < cellsLength; cellKey += 1) {
        const [char, hlId, length = 1] = cells[cellKey];
        if (isFinite(hlId)) {
          currentHlId = hlId;
        }
        for (let j = 0; j < length; j += 1) {
          printChar(row, col + lineLength + j, char, currentHlId);
        }
        lineLength += length;
      }
    }
    needRerender = true;
    if (
      chars[cursorPosition[0]] &&
      chars[cursorPosition[0]][cursorPosition[1]] &&
      cursorChar !== chars[cursorPosition[0]][cursorPosition[1]].char
    ) {
      redrawCursor();
    }
  },

  grid_clear: () => {
    cursorPosition = [0, 0];
    charsContainer.children.forEach((c) => {
      c.visible = false; // eslint-disable-line no-param-reassign
    });
    bgContainer.children.forEach((c) => {
      c.visible = false; // eslint-disable-line no-param-reassign
    });
    for (let i = 0; i <= rows; i += 1) {
      if (!chars[i]) chars[i] = {};
      for (let j = 0; j <= cols; j += 1) {
        if (!chars[i][j]) chars[i][j] = {};
        chars[i][j].char = null;
      }
    }
    needRerender = true;
  },

  grid_destroy: () => {},

  grid_cursor_goto: ([[_, ...newCursor]]) => {
    repositionCursor(newCursor);
  },

  grid_scroll: ([[_grid, top, bottom, left, right, scrollCount]]) => {
    for (
      let i = scrollCount > 0 ? top : bottom - 1;
      scrollCount > 0 ? i <= bottom - scrollCount - 1 : i >= top - scrollCount;
      i += scrollCount > 0 ? 1 : -1
    ) {
      for (let j = left; j <= right - 1; j += 1) {
        const sourceI = i + scrollCount;

        if (!chars[i]) chars[i] = {};
        if (!chars[i][j]) chars[i][j] = {};

        if (!chars[sourceI]) chars[sourceI] = {};
        if (!chars[sourceI][j]) chars[sourceI][j] = {};

        // Swap char to scroll to destination
        [chars[i][j], chars[sourceI][j]] = [chars[sourceI][j], chars[i][j]];

        // Update scrolled char sprite position
        if (chars[i][j].sprite) {
          chars[i][j].sprite.y = i * charHeight;
          chars[i][j].bg.y = i * charHeight;
        }

        // Clear and reposition old char
        if (chars[sourceI][j].sprite) {
          chars[sourceI][j].sprite.visible = false;
          chars[sourceI][j].bg.visible = false;
          chars[sourceI][j].sprite.y = sourceI * charHeight;
          chars[sourceI][j].bg.y = sourceI * charHeight;
        }
      }
    }
    needRerender = true;
  },
};

const handleSet = {
  fontfamily: (newFontFamily) => {
    fontFamily = newFontFamily;
  },

  fontsize: (newFontSize) => {
    fontSize = parseInt(newFontSize, 10);
  },

  letterspacing: (newLetterSpacing) => {
    letterSpacing = parseInt(newLetterSpacing, 10);
  },

  lineheight: (newLineHeight) => {
    lineHeight = parseFloat(newLineHeight);
  },

  bold: (value) => {
    showBold = value;
  },

  italic: (value) => {
    showItalic = value;
  },

  underline: (value) => {
    showUnderline = value;
  },

  undercurl: (value) => {
    showUndercurl = value;
  },
};

const redraw = (args) => {
  for (let i = 0; i < args.length; i += 1) {
    const [cmd, ...props] = args[i];
    if (redrawCmd[cmd]) {
      redrawCmd[cmd](props);
    } else {
      console.warn('Unknown redraw command', cmd, props); // eslint-disable-line no-console
    }
  }
};

const setScale = () => {
  scale = isRetina() ? RETINA_SCALE : 1;
  screenContainer.style.transform = `scale(${1 / scale})`;
  screenContainer.style.width = `${scale * 100}%`;
  screenContainer.style.height = `${scale * 100}%`;

  // Detect when you drag between retina/non-retina displays
  window.matchMedia('screen and (min-resolution: 2dppx)').addListener(async () => {
    setScale();
    measureCharSize();
    await nvim.uiTryResize(cols, rows);
  });
};

/**
 * Return grid [col, row] coordinates by pixel coordinates.
 */
export const screenCoords = (width, height) => {
  return [Math.floor((width * scale) / charWidth), Math.floor((height * scale) / charHeight)];
};

const resize = (forceRedraw = false) => {
  const [newCols, newRows] = screenCoords(window.innerWidth, window.innerHeight);
  if (newCols !== cols || newRows !== rows || forceRedraw) {
    cols = newCols;
    rows = newRows;
    nvim.uiTryResize(cols, rows);
  }
};

const uiAttach = () => {
  [cols, rows] = screenCoords(window.innerWidth, window.innerHeight);
  nvim.uiAttach(cols, rows, { ext_linegrid: true });
  window.addEventListener(
    'resize',
    throttle(() => resize(), 1000 / TARGET_FPS),
  );
};

const updateSettings = (settings, isInitial = false) => {
  let requireRedraw = isInitial;
  const requireRedrawProps = [
    'fontfamily',
    'fontsize',
    'letterspacing',
    'lineheight',
    'bold',
    'italic',
    'underline',
    'undercurl',
  ];

  Object.keys(settings).forEach((key) => {
    if (handleSet[key]) {
      requireRedraw = requireRedraw || requireRedrawProps.includes(key);
      handleSet[key](settings[key]);
    }
  });

  if (requireRedraw) {
    measureCharSize();
    PIXI.utils.clearTextureCache();
    if (!isInitial) {
      resize(true);
    }
  }
};

initScreen();
initCursor();
setScale();

const screen = (settings) => {
  nvim.on('redraw', redraw);

  ipcRenderer.on('updateSettings', (_, s) => updateSettings(s));
  updateSettings(settings, true);

  uiAttach();
};

export default screen;
