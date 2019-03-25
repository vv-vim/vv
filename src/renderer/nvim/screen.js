import debounce from 'lodash/debounce';
import isFinite from 'lodash/isFinite';
// import log from '../../lib/log';

import * as PIXI from 'pixi.js';

import { nvim } from './api';

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

let charsCache = {};
let texturesCache = {};

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

const debouncedTickerStop = debounce(() => ticker.stop(), 200);

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

    charsCache = {};
    texturesCache = {};
  }
  screenEl.removeChild(char);
};

const debouncedMeasureCharSize = debounce(measureCharSize, 10);

const font = p =>
  [p.hiItalic ? 'italic' : '', p.hiBold ? 'bold' : '', `${scaledFontSize()}px`, fontFamily].join(
    ' ',
  );

const getCharBitmap = (char, props, key) => {
  if (!charsCache[key]) {
    const c = document.createElement('canvas');
    c.width = charWidth * 3;
    c.height = charHeight;
    const ctx = c.getContext('2d', { alpha: true });
    ctx.fillStyle = props.fgColor;
    ctx.font = font(props);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    if (char) {
      ctx.fillText(
        char,
        Math.round(scaledLetterSpacing() / 2) + charWidth,
        Math.round(charHeight / 2),
      );
    }

    if (props.hiUnderline) {
      ctx.strokeStyle = props.fgColor;
      ctx.lineWidth = scale;
      ctx.beginPath();
      ctx.moveTo(charWidth, charHeight - scale);
      ctx.lineTo(charWidth * 2, charHeight - scale);
      ctx.stroke();
    }

    if (props.hiUndercurl) {
      ctx.strokeStyle = props.spColor;
      ctx.lineWidth = scaledFontSize() * 0.08;
      const x = charWidth;
      const y = charHeight - (scaledFontSize() * 0.08) / 2;
      const h = charHeight * 0.2; // Height of the wave
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + x / 4, y, x + x / 4, y - h / 2, x + x / 2, y - h / 2);
      ctx.bezierCurveTo(x + (x / 4) * 3, y - h / 2, x + (x / 4) * 3, y, x + x, y);
      ctx.stroke();
    }

    charsCache[key] = c;
  }
  return charsCache[key];
};

const getCharTexture = (char, hlId) => {
  const key = char + '-' + hlId; // eslint-disable-line prefer-template
  if (!texturesCache[key]) {
    const props = highlightTable[hlId].calculated;
    texturesCache[key] = PIXI.Texture.fromCanvas(getCharBitmap(char, props, key));
  }
  return texturesCache[key];
};

const printChar = (i, j, char, hlId) => {
  if (!chars[i]) chars[i] = {};
  if (!chars[i][j]) chars[i][j] = {};

  if (!chars[i][j].sprite) {
    chars[i][j].sprite = new PIXI.Sprite();
    stage.addChild(chars[i][j].sprite);
    chars[i][j].sprite.x = (j - 1) * charWidth;
    chars[i][j].sprite.y = i * charHeight;
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

const getColor = (c, defaultColor = null) => {
  if (typeof c !== 'number' || c === -1) return defaultColor;
  return `rgb(${(c >> 16) & 0xff},${(c >> 8) & 0xff},${c & 0xff})`; // eslint-disable-line no-bitwise
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
    const key = char + '-' + (m.attr_id ? m.attr_id : 'reverse0'); // eslint-disable-line prefer-template
    cursorEl.style.background = highlightAttrs.bgColor;
    cursorContext.drawImage(getCharBitmap(char, highlightAttrs, key), -charWidth, 0);
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
      nvim().command(`VVset fontfamily=${newFontFamily}`);
      if (newFontSize && newFontFamily !== '') {
        nvim().command(`VVset fontsize=${newFontSize}`);
      }
    }
  },
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
    charsCache = {};
    texturesCache = {};
  }
};

const redrawChars = debounce(() => {
  for (let i = 0; i <= rows; i += 1) {
    if (chars[i]) {
      for (let j = 0; j <= cols; j += 1) {
        if (chars[i][j] && chars[i][j].needsRedraw) {
          printChar(i, j, chars[i][j].char, chars[i][j].hlId);
        }
      }
    }
  }
}, 10);

// When we get `default_colors_set`, we need to redraw chars that have colors referenced to
// default colors. First we mark all chars with `needsRedraw`, then on each `printChar` we set
// it to `false`. After `grid_line` we redraw chars that still have `needsRedraw`.
// https://github.com/neovim/neovim/blob/5a11e55/runtime/doc/ui.txt#L237
const requireRedrawAll = () => {
  for (let i = 0; i <= rows; i += 1) {
    if (chars[i]) {
      for (let j = 0; j <= cols; j += 1) {
        if (chars[i][j] && isFinite(chars[i][j].hlId)) {
          const { foreground, background, special } = highlightTable[chars[i][j].hlId].value;
          if (!chars[i][j].hlId || !foreground || !background || !special) {
            chars[i][j].needsRedraw = true;
          }
        }
      }
    }
  }
  redrawChars();
};

// https://github.com/neovim/neovim/blob/master/runtime/doc/ui.txt
const redrawCmd = {
  set_title: () => {},
  set_icon: () => {},

  mode_info_set: props => {
    modeInfoSet = props[1].reduce((r, o) => ({ ...r, [o.name]: o }), {});
    redrawCursor();
  },

  option_set: (...options) => {
    options.forEach(([option, value]) => {
      if (optionSet[option]) {
        optionSet[option](value);
      } else {
        // console.warn('Unknown option', option, value); // eslint-disable-line no-console
      }
    });
  },

  mode_change: (...modes) => {
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

  flush: () => {
    redrawCursor(); // TODO: check if char under cursor changed first
  },

  // New api
  grid_resize: props => {
    cols = props[1];
    rows = props[2];
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

  default_colors_set: (...p) => {
    const props = p[p.length - 1];
    const [foreground, background, special] = props;
    const calculated = {
      bgColor: getColor(background, defaultBgColor),
      fgColor: getColor(foreground, defaultFgColor),
      spColor: getColor(special, defaultSpColor),
      hiItalic: false,
      hiBold: false,
      hiUnderline: false,
      hiUndercurl: false,
    };
    body.style.background = calculated.bgColor;
    highlightTable[0] = {
      value: {
        foreground,
        background,
        special,
      },
      calculated,
    };
    recalculateHighlightTable();
    requireRedrawAll();
    context.fillStyle = calculated.bgColor;
    context.fillRect(0, 0, canvasEl.width, canvasEl.height);
  },

  hl_attr_define: (...props) => {
    props.forEach(([id, value]) => {
      highlightTable[id] = {
        value,
      };
    });
    recalculateHighlightTable();
  },

  grid_line: (...props) => {
    for (let gridKey = 0, gridLength = props.length; gridKey < gridLength; gridKey += 1) {
      const [_grid, row, col, cells] = props[gridKey]; // eslint-disable-line no-unused-vars

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

  grid_cursor_goto: ([_grid, ...newCursor]) => {
    if (newCursor[0] !== cursor[0] && newCursor[0] === rows - 1) {
      debouncedRepositionCursor(newCursor);
    } else {
      repositionCursor(newCursor);
    }
  },

  grid_scroll: ([_grid, top, bottom, left, right, scrollCount]) => {
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
        if (chars[i + scrollCount] && chars[i + scrollCount][j]) {
          chars[i][j] = chars[i + scrollCount][j];
          chars[i][j].sprite.x = (j - 1) * charWidth;
          chars[i][j].sprite.y = i * charHeight;
          chars[i + scrollCount][j] = {};
        } else {
          chars[i][j] = null;
        }
      }
    };

    const cleanJ = i => {
      for (let j = left; j <= right - 1; j += 1) {
        if (chars[i] && chars[i][j]) {
          stage.removeChild(chars[i][j].sprite);
          chars[i][j] = null;
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

  // VV specific commands
  vv_fontfamily: newFontFamily => {
    fontFamily = newFontFamily;
    debouncedMeasureCharSize();
  },

  vv_fontsize: newFontSize => {
    fontSize = parseInt(newFontSize, 10);
    debouncedMeasureCharSize();
  },

  vv_letterspacing: newLetterSpacing => {
    letterSpacing = parseInt(newLetterSpacing, 10);
    debouncedMeasureCharSize();
  },

  vv_lineheight: newLineHeight => {
    lineHeight = parseFloat(newLineHeight);
    debouncedMeasureCharSize();
  },

  vv_bold: value => {
    showBold = value;
  },

  vv_italic: value => {
    showItalic = value;
  },

  vv_underline: value => {
    showUnderline = value;
  },

  vv_undercurl: value => {
    showUndercurl = value;
  },
};

const handleNotification = async (method, args) => {
  if (method === 'redraw') {
    ticker.start();
    for (let i = 0; i < args.length; i += 1) {
      const [cmd, ...props] = args[i];
      if (redrawCmd[cmd]) {
        redrawCmd[cmd](...props);
      } else {
        console.warn('Unknown redraw command', cmd, props); // eslint-disable-line no-console
      }
    }
    debouncedTickerStop();
  }
};

const setScale = () => {
  scale = isRetina() ? RETINA_SCALE : 1;
  screenContainer.style.transform = `scale(${1 / scale})`;
  screenContainer.style.width = `${scale * 100}%`;
  screenContainer.style.height = `${scale * 100}%`;
};

const screen = containerId => {
  screenContainer = document.getElementById(containerId);
  if (!screenContainer) return false;

  screenContainer.style.position = 'absolute';
  screenContainer.style.transformOrigin = '0 0';

  setScale();

  initScreen();
  initCursor();
  measureCharSize();

  nvim().on('notification', handleNotification);

  // Detect when you drag between retina/non-retina displays
  window.matchMedia('screen and (min-resolution: 2dppx)').addListener(async () => {
    canvasEl.style.opacity = 0;
    setScale();
    measureCharSize();
    await nvim().uiTryResize(cols, rows);
    canvasEl.style.opacity = 1;
  });

  return redrawCmd;
};

export const screenCoords = (width, height, checkCharSize = false) => {
  if (checkCharSize) {
    debouncedMeasureCharSize.flush();
  }
  return [Math.floor((width * scale) / charWidth), Math.floor((height * scale) / charHeight)];
};

export default screen;
