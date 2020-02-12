import debounce from 'lodash/debounce';
import isFinite from 'lodash/isFinite';

import * as PIXI from './lib/pixi';

import { remote, ipcRenderer } from './preloaded/electron';

import nvim from './nvim';

import getColor from '../lib/getColor';

// import log from './../lib/log';

const [body] = document.getElementsByTagName('body');

let screenContainer;

let cursorEl;
let cursorCanvasEl;
let cursorContext;
let cursor;
let cursorAnimation;

let screenEl;
let canvasEl;
let context;

let scale;
let charWidth;
let charHeight;

let fontFamily = 'monospace';
let fontSize = 12;
let lineHeight = 1.25;
let letterSpacing = 0;

let defaultFgColor = 'rgb(255,255,255)';
let defaultBgColor = 'rgb(0,0,0)';
let defaultSpColor = 'rgb(255,255,255)';

let cols;
let rows;

let modeInfoSet;
let mode;

let showBold = true;
let showItalic = true;
let showUnderline = true;
let showUndercurl = true;

let charBitmapCanvas;
let charBitmapContext;

// Removing sprites is very expensive. Move sprites to clear to spritesPool array
// and reuse them later if we will need to create a new sprite.
const spritesPool = [];

let chars = {};

const highlightTable = {};

// WebGL
let stage;
let ticker;
let renderer;

export const getCursorElement = () => cursorEl;

const initCursor = () => {
  cursorEl = document.createElement('div');
  cursorEl.style.position = 'absolute';
  cursorEl.style.zIndex = 100;
  cursorEl.style.top = 0;
  cursorEl.style.left = 0;

  cursorCanvasEl = document.createElement('canvas');

  cursorContext = cursorCanvasEl.getContext('2d', { alpha: true });

  cursorEl.appendChild(cursorCanvasEl);
  screenEl.appendChild(cursorEl);

  cursor = [0, 0];
};

const initScreen = () => {
  screenEl = document.createElement('div');

  screenEl.style.contain = 'strict';
  screenEl.style.overflow = 'hidden';

  // Init WebGL for text
  const pixi = new PIXI.Application({
    transparent: true,
    autostart: false,
  });

  screenEl.appendChild(pixi.view);

  screenContainer.appendChild(screenEl);

  ({ stage, ticker, renderer } = pixi);
  ticker.stop();

  stage.interactiveChildren = false;

  // Init screen for background
  canvasEl = document.createElement('canvas');

  canvasEl.style.position = 'absolute';
  canvasEl.style.top = 0;
  canvasEl.style.left = 0;
  canvasEl.style.zIndex = -1;

  context = canvasEl.getContext('2d', { alpha: false });

  screenEl.appendChild(canvasEl);
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
    cursorCanvasEl.width = charWidth;
    cursorCanvasEl.height = charHeight;
    cursorEl.style.width = `${charWidth}px`;
    cursorEl.style.height = `${charHeight}px`;

    if (charBitmapCanvas) {
      charBitmapCanvas.width = charWidth * 3;
      charBitmapCanvas.height = charHeight;
    }

    // PIXI.utils.destroyTextureCache();
  }
  screenEl.removeChild(char);
};

const font = p =>
  [p.hiItalic ? 'italic' : '', p.hiBold ? 'bold' : '', `${scaledFontSize()}px`, fontFamily].join(
    ' ',
  );

const getCharBitmap = (char, props) => {
  if (!charBitmapCanvas) {
    charBitmapCanvas = new OffscreenCanvas(charWidth * 3, charHeight);
    charBitmapContext = charBitmapCanvas.getContext('2d', { alpha: true });
  }

  charBitmapContext.fillStyle = props.fgColor;
  charBitmapContext.font = font(props);
  charBitmapContext.textAlign = 'left';
  charBitmapContext.textBaseline = 'middle';
  if (char) {
    charBitmapContext.fillText(
      char,
      Math.round(scaledLetterSpacing() / 2) + charWidth,
      Math.round(charHeight / 2),
    );
  }

  if (props.hiUnderline) {
    charBitmapContext.strokeStyle = props.fgColor;
    charBitmapContext.lineWidth = scale;
    charBitmapContext.beginPath();
    charBitmapContext.moveTo(charWidth, charHeight - scale);
    charBitmapContext.lineTo(charWidth * 2, charHeight - scale);
    charBitmapContext.stroke();
  }

  if (props.hiUndercurl) {
    charBitmapContext.strokeStyle = props.spColor;
    charBitmapContext.lineWidth = scaledFontSize() * 0.08;
    const x = charWidth;
    const y = charHeight - (scaledFontSize() * 0.08) / 2;
    const h = charHeight * 0.2; // Height of the wave
    charBitmapContext.beginPath();
    charBitmapContext.moveTo(x, y);
    charBitmapContext.bezierCurveTo(x + x / 4, y, x + x / 4, y - h / 2, x + x / 2, y - h / 2);
    charBitmapContext.bezierCurveTo(x + (x / 4) * 3, y - h / 2, x + (x / 4) * 3, y, x + x, y);
    charBitmapContext.stroke();
  }

  return charBitmapCanvas.transferToImageBitmap();
};

const textureCacheKey = (char, hlId) => {
  const { fgColor, spColor, hiItalic, hiBold, hiUnderline, hiUndercurl } = highlightTable[
    hlId
  ].calculated;
  return `${char}1${fontFamily}2${fontSize}3${fgColor}4${spColor}5${hiItalic}6${hiBold}7${hiUnderline}8${hiUndercurl}`;
};

const getCharTexture = (char, hlId) => {
  const key = textureCacheKey(char, hlId);

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
    if (spritesPool.length > 0) {
      chars[i][j].sprite = spritesPool.pop();
      chars[i][j].sprite.visible = true;
    } else {
      chars[i][j].sprite = new PIXI.Sprite();
      stage.addChild(chars[i][j].sprite);
    }
    chars[i][j].sprite.position.x = (j - 1) * charWidth;
    chars[i][j].sprite.position.y = i * charHeight;
  }

  // Print char to WebGL
  chars[i][j].char = char;
  chars[i][j].hlId = hlId;
  chars[i][j].needsRedraw = false;
  chars[i][j].sprite.texture = getCharTexture(char, hlId);

  // Draw background in canvas
  context.fillStyle = highlightTable[hlId].calculated.bgColor;
  context.fillRect(j * charWidth, i * charHeight, charWidth, charHeight);

  // If this is the last col, fill the next char on extra col with it's bg
  if (j === cols - 1) {
    context.fillRect((j + 1) * charWidth, i * charHeight, charWidth, charHeight);
  }
};

const clearCursor = () => {
  cursorContext.clearRect(0, 0, charWidth, charHeight);
};

const redrawCursor = () => {
  const m = modeInfoSet && modeInfoSet[mode];
  if (!m) return;
  clearCursor();

  let cursorChar = {
    char: ' ',
    bold: false,
    italic: false,
  };
  if (chars[cursor[0]] && chars[cursor[0]][cursor[1]]) {
    cursorChar = chars[cursor[0]][cursor[1]];
  }

  const highlightAttrs = { ...highlightTable[m.attr_id].calculated };
  if (m.attr_id === 0) {
    highlightAttrs.bgColor = highlightTable[0].calculated.fgColor;
    highlightAttrs.fgColor = highlightTable[0].calculated.bgColor;
    highlightAttrs.spColor = highlightTable[0].calculated.bgColor;
  }

  if (m.cursor_shape === 'block' && m.name.indexOf('cmdline') === -1) {
    const { char } = cursorChar;
    cursorEl.style.background = highlightAttrs.bgColor;
    cursorContext.drawImage(getCharBitmap(char, highlightAttrs), -charWidth, 0);
  } else if (m.cursor_shape === 'vertical') {
    cursorEl.style.background = 'none';
    const curWidth = m.cell_percentage
      ? Math.max(scale, Math.round((charWidth / 100) * m.cell_percentage))
      : scale;
    cursorContext.fillStyle = highlightAttrs.bgColor;
    cursorContext.fillRect(0, 0, curWidth, charHeight);
  } else if (m.cursor_shape === 'horizontal') {
    cursorEl.style.background = 'none';
    const curHeight = m.cell_percentage
      ? Math.max(scale, Math.round((charHeight / 100) * m.cell_percentage))
      : scale;
    cursorContext.fillStyle = highlightAttrs.bgColor;
    cursorContext.fillRect(0, charHeight - curHeight, charWidth, curHeight);
  }

  // Cursor blink
  if (cursorAnimation) {
    cursorAnimation.cancel();
  }
  if (m.blinkoff && m.blinkon) {
    const offset = m.blinkon / (m.blinkon + m.blinkoff);
    cursorAnimation = cursorEl.animate(
      [
        { opacity: 1, offset: 0 },
        { opacity: 1, offset },
        { opacity: 0, offset },
        { opacity: 0, offset: 1 },
        { opacity: 1, offset: 1 },
      ],
      {
        duration: m.blinkoff + m.blinkon,
        iterations: 'Infinity',
        delay: m.blinkwait || 0,
      },
    );
  }
};

let debouncedRepositionCursor;

export const repositionCursor = newCursor => {
  if (debouncedRepositionCursor) debouncedRepositionCursor.cancel();
  if (newCursor) cursor = newCursor;
  const left = cursor[1] * charWidth;
  const top = cursor[0] * charHeight;
  cursorEl.style.transform = `translate(${left}px, ${top}px)`;
  redrawCursor();
};

debouncedRepositionCursor = debounce(repositionCursor, 10);

const optionSet = {
  guifont: newFont => {
    const [newFontFamily, newFontSize] = newFont.trim().split(':h');
    if (newFontFamily && newFontFamily !== '') {
      nvim.command(`VVset fontfamily=${newFontFamily}`);
      if (newFontSize && newFontFamily !== '') {
        nvim.command(`VVset fontsize=${newFontSize}`);
      }
    }
  },
};

const setDefaultHl = ({ bgColor, fgColor, spColor }) => {
  const calculated = {
    bgColor,
    fgColor,
    spColor,
    hiItalic: false,
    hiBold: false,
    hiUnderline: false,
    hiUndercurl: false,
  };
  highlightTable[0] = {
    calculated,
  };
  body.style.background = calculated.bgColor;
  const win = remote.getCurrentWindow();
  win.setBackgroundColor(calculated.bgColor);
};

const recalculateHighlightTable = () => {
  if (highlightTable[0]) {
    Object.keys(highlightTable).forEach(id => {
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
          hiItalic: showItalic && italic,
          hiBold: showBold && bold,
          hiUnderline: showUnderline && underline,
          hiUndercurl: showUndercurl && undercurl,
        };
      }
    });
    // PIXI.utils.destroyTextureCache();

    for (let i = 0; i <= rows; i += 1) {
      if (chars[i]) {
        for (let j = 0; j <= cols; j += 1) {
          if (chars[i][j] && chars[i][j].char && isFinite(chars[i][j].hlId)) {
            printChar(i, j, chars[i][j].char, chars[i][j].hlId);
          }
        }
      }
    }
  }
};

// https://github.com/neovim/neovim/blob/master/runtime/doc/ui.txt
const redrawCmd = {
  set_title: () => {},
  set_icon: () => {},

  mode_info_set: props => {
    modeInfoSet = props[0][1].reduce((r, o) => ({ ...r, [o.name]: o }), {});
    redrawCursor();
  },

  option_set: options => {
    options.forEach(([option, value]) => {
      if (optionSet[option]) {
        optionSet[option](value);
      } else {
        // console.warn('Unknown option', option, value); // eslint-disable-line no-console
      }
    });
  },

  mode_change: modes => {
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

  flush: () => {
    redrawCursor(); // TODO: check if char under cursor changed first
  },

  // New api
  grid_resize: props => {
    cols = props[0][1];
    rows = props[0][2];
    // Add extra column on the right to fill it with adjacent color to have a nice right border
    screenEl.style.width = `${(cols + 1) * charWidth}px`;
    screenEl.style.height = `${rows * charHeight}px`;
    canvasEl.width = (cols + 1) * charWidth;
    canvasEl.height = rows * charHeight;
    context.fillStyle = highlightTable[0]
      ? highlightTable[0].calculated.background
      : defaultBgColor;
    context.fillRect(0, 0, canvasEl.width, canvasEl.height);

    renderer.clear();
    renderer.resize(canvasEl.width, canvasEl.height);
  },

  default_colors_set: props => {
    const [foreground, background, special] = props[props.length - 1];

    setDefaultHl({
      bgColor: getColor(background, defaultBgColor),
      fgColor: getColor(foreground, defaultFgColor),
      spColor: getColor(special, defaultSpColor),
    });
    recalculateHighlightTable();
    context.fillStyle = highlightTable[0].calculated.bgColor;
    context.fillRect(0, 0, canvasEl.width, canvasEl.height);
  },

  hl_attr_define: props => {
    props.forEach(([id, value]) => {
      highlightTable[id] = {
        value,
      };
    });
    recalculateHighlightTable();
  },

  grid_line: props => {
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
          const offset = col + lineLength + j;
          printChar(row, offset, char, currentHlId);
        }
        lineLength += length;
      }
    }
  },

  grid_clear: () => {
    cursor = [0, 0];
    context.fillStyle = highlightTable[0] ? highlightTable[0].calculated.bgColor : defaultBgColor;
    context.fillRect(0, 0, canvasEl.width, canvasEl.height);
    chars = {};
    stage.removeChildren();
  },

  grid_destroy: () => {},

  grid_cursor_goto: ([[_, ...newCursor]]) => {
    if (newCursor[0] !== cursor[0] && newCursor[0] === rows - 1) {
      debouncedRepositionCursor(newCursor);
    } else {
      repositionCursor(newCursor);
    }
  },

  grid_scroll: ([[_grid, top, bottom, left, right, scrollCount]]) => {
    // Scroll background
    const x = left * charWidth; // region left
    let y; // region top
    let w = (right - left) * charWidth; // clipped part width
    const h = (bottom - top - Math.abs(scrollCount)) * charHeight; // clipped part height
    const X = x; // destination left
    let Y; // destination top

    if (right === cols) {
      // Add extra char if it is far right rect
      w += charWidth;
    }

    if (scrollCount > 0) {
      // scroll down
      y = (top + scrollCount) * charHeight;
      Y = top * charHeight;
    } else {
      // scroll up
      y = top * charHeight;
      Y = (top - scrollCount) * charHeight;
    }

    // Copy scrolled lines
    // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
    context.drawImage(canvasEl, x, y, w, h, X, Y, w, h);

    // Scroll chars
    const scrollJ = i => {
      for (let j = left; j <= right - 1; j += 1) {
        if (!chars[i]) chars[i] = {};
        if (
          chars[i + scrollCount] &&
          chars[i + scrollCount][j] &&
          chars[i + scrollCount][j].sprite
        ) {
          chars[i][j] = chars[i + scrollCount][j];
          chars[i][j].sprite.x = (j - 1) * charWidth;
          chars[i][j].sprite.y = i * charHeight;
          chars[i + scrollCount][j] = {};
        } else {
          chars[i][j] = {};
        }
      }
    };

    const cleanJ = i => {
      for (let j = left; j <= right - 1; j += 1) {
        if (chars[i] && chars[i][j] && chars[i][j].sprite) {
          chars[i][j].sprite.visible = false;
          spritesPool.push(chars[i][j].sprite);
          chars[i][j] = {};
        }
      }
    };

    if (scrollCount > 0) {
      // scroll down
      for (let i = top; i <= top + scrollCount - 1; i += 1) {
        cleanJ(i);
      }
      for (let i = top; i <= bottom - scrollCount - 1; i += 1) {
        scrollJ(i);
      }
    } else {
      // scroll up
      for (let i = bottom + scrollCount; i <= bottom - 1; i += 1) {
        cleanJ(i);
      }
      for (let i = bottom - 1; i >= top - scrollCount; i -= 1) {
        scrollJ(i);
      }
    }
  },
};

const handleSet = {
  fontfamily: newFontFamily => {
    fontFamily = newFontFamily;
  },

  fontsize: newFontSize => {
    fontSize = parseInt(newFontSize, 10);
  },

  letterspacing: newLetterSpacing => {
    letterSpacing = parseInt(newLetterSpacing, 10);
  },

  lineheight: newLineHeight => {
    lineHeight = parseFloat(newLineHeight);
  },

  bold: value => {
    showBold = value;
  },

  italic: value => {
    showItalic = value;
  },

  underline: value => {
    showUnderline = value;
  },

  undercurl: value => {
    showUndercurl = value;
  },

  defaultbgcolor: value => {
    defaultBgColor = value;
  },

  defaultfgcolor: value => {
    defaultFgColor = value;
  },

  defaultspcolor: value => {
    defaultSpColor = value;
  },
};

const debouncedTickerStop = debounce(() => ticker.stop(), 100);

const redraw = args => {
  ticker.start();
  for (let i = 0; i < args.length; i += 1) {
    const [cmd, ...props] = args[i];
    if (redrawCmd[cmd]) {
      redrawCmd[cmd](props);
    } else {
      console.warn('Unknown redraw command', cmd, props); // eslint-disable-line no-console
    }
  }
  debouncedTickerStop();
};

const setScale = () => {
  scale = isRetina() ? RETINA_SCALE : 1;
  screenContainer.style.transform = `scale(${1 / scale})`;
  screenContainer.style.width = `${scale * 100}%`;
  screenContainer.style.height = `${scale * 100}%`;
};

/**
 * Return grid [col, row] coordinates by pixel coordinates.
 * */
export const screenCoords = (width, height) => {
  return [Math.floor((width * scale) / charWidth), Math.floor((height * scale) / charHeight)];
};

const resize = (forceRedraw = false) => {
  const { getContentSize } = remote.getCurrentWindow();
  const [newCols, newRows] = screenCoords(...getContentSize());
  if (newCols !== cols || newRows !== rows || forceRedraw) {
    cols = newCols;
    rows = newRows;
    nvim.uiTryResize(cols, rows);
  }
};

const uiAttach = () => {
  const { getContentSize } = remote.getCurrentWindow();
  const [newCols, newRows] = screenCoords(...getContentSize());
  cols = newCols;
  rows = newRows;

  nvim.uiAttach(cols, rows, { ext_linegrid: true });
  window.addEventListener(
    'resize',
    debounce(() => resize(), 50),
  );
};

const updateSettings = (settings, isInitial = false) => {
  let requireRedraw = false;
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

  Object.keys(settings).forEach(key => {
    if (handleSet[key]) {
      requireRedraw = requireRedraw || requireRedrawProps.includes(key);
      handleSet[key](settings[key]);
    }
  });

  // setDefaultHl({
  //   bgColor: defaultBgColor,
  //   fgColor: defaultFgColor,
  //   spColor: defaultSpColor,
  // });

  if (!isInitial && requireRedraw) {
    measureCharSize();
    resize(true);
  }
};

const screen = (containerId, settings) => {
  updateSettings(settings, true);

  screenContainer = document.getElementById(containerId);
  if (!screenContainer) return false;

  screenContainer.style.position = 'absolute';
  screenContainer.style.transformOrigin = '0 0';

  setScale();

  initScreen();
  initCursor();

  nvim.on('redraw', redraw);

  // Detect when you drag between retina/non-retina displays
  window.matchMedia('screen and (min-resolution: 2dppx)').addListener(async () => {
    canvasEl.style.opacity = 0;
    setScale();
    measureCharSize();
    await nvim.uiTryResize(cols, rows);
    canvasEl.style.opacity = 1;
  });

  measureCharSize();
  uiAttach(true);

  ipcRenderer.on('updateSettings', (_, s) => updateSettings(s));

  return redrawCmd;
};

export default screen;
