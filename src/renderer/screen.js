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

let charCanvas;
let charCtx;

const chars = {};

const highlightTable = {
  '0': {
    calculated: {
      bgColor: defaultBgColor,
      fgColor: defaultFgColor,
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

    if (charCanvas) {
      charCanvas.width = charWidth * 3;
      charCanvas.height = charHeight;
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
  if (!charCanvas) {
    charCanvas = new OffscreenCanvas(charWidth * 3, charHeight);
    charCtx = charCanvas.getContext('2d', { alpha: true });
  }

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
    chars[i][j].sprite = new PIXI.Sprite();
    stage.addChild(chars[i][j].sprite);
  }

  // Print char to WebGL
  chars[i][j].char = char;
  chars[i][j].hlId = hlId;
  chars[i][j].sprite.texture = getCharTexture(char, hlId);
  chars[i][j].sprite.position.set((j - 1) * charWidth, i * charHeight);
  chars[i][j].sprite.visible = true;

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

  const highlightAttrs = { ...highlightTable[m.attr_id].calculated };
  if (m.attr_id === 0) {
    highlightAttrs.bgColor = highlightTable[0].calculated.fgColor;
    highlightAttrs.fgColor = highlightTable[0].calculated.bgColor;
    highlightAttrs.spColor = highlightTable[0].calculated.bgColor;
  }

  if (m.cursor_shape === 'block' && m.name.indexOf('cmdline') === -1) {
    const char = chars[cursor[0]][cursor[1]].char || ' ';
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

const reprintAllChars = debounce(() => {
  context.fillStyle = highlightTable[0].calculated.bgColor;
  context.fillRect(0, 0, canvasEl.width, canvasEl.height);
  body.style.background = highlightTable[0].calculated.bgColor;
  remote.getCurrentWindow().setBackgroundColor(highlightTable[0].calculated.bgColor);

  // PIXI.utils.destroyTextureCache();
  for (let i = 0; i <= rows; i += 1) {
    if (!chars[i]) chars[i] = {};
    for (let j = 0; j <= cols; j += 1) {
      if (!chars[i][j]) chars[i][j] = {};
      if (chars[i][j].char && isFinite(chars[i][j].hlId)) {
        printChar(i, j, chars[i][j].char, chars[i][j].hlId);
      }
    }
  }
}, 10);

const recalculateHighlightTable = () => {
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
  reprintAllChars();
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
  if (!highlightTable[0] || !isEqual(highlightTable[0].calculated, calculated)) {
    highlightTable[0] = { calculated };
    recalculateHighlightTable();
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
    context.fillStyle = highlightTable[0] ? highlightTable[0].calculated.bgColor : defaultBgColor;
    context.fillRect(0, 0, canvasEl.width, canvasEl.height);

    renderer.resize(canvasEl.width, canvasEl.height);
  },

  default_colors_set: props => {
    const [foreground, background, special] = props[props.length - 1];

    setDefaultHl({
      bgColor: getColor(background, defaultBgColor),
      fgColor: getColor(foreground, defaultFgColor),
      spColor: getColor(special, defaultSpColor),
    });
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

    stage.children.forEach(c => {
      c.visible = false; // eslint-disable-line no-param-reassign
    });
    for (let i = 0; i <= rows; i += 1) {
      if (!chars[i]) chars[i] = {};
      for (let j = 0; j <= cols; j += 1) {
        if (!chars[i][j]) chars[i][j] = {};
        chars[i][j].char = null;
      }
    }
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
        }

        // Clear and reposition old char
        if (chars[sourceI][j].sprite) {
          chars[sourceI][j].sprite.visible = false;
          chars[sourceI][j].sprite.y = sourceI * charHeight;
        }
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
};

const debouncedTickerStop = debounce(() => ticker.stop(), 200);

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

  // Detect when you drag between retina/non-retina displays
  window.matchMedia('screen and (min-resolution: 2dppx)').addListener(async () => {
    canvasEl.style.opacity = 0;
    setScale();
    measureCharSize();
    await nvim.uiTryResize(cols, rows);
    canvasEl.style.opacity = 1;
  });
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
    throttle(() => resize(), 30),
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

  Object.keys(settings).forEach(key => {
    if (handleSet[key]) {
      requireRedraw = requireRedraw || requireRedrawProps.includes(key);
      handleSet[key](settings[key]);
    }
  });

  if (requireRedraw) {
    measureCharSize();
    if (!isInitial) {
      resize(true);
    }
  }
};

initScreen();
initCursor();
setScale();

const screen = settings => {
  nvim.on('redraw', redraw);

  ipcRenderer.on('updateSettings', (_, s) => updateSettings(s));
  updateSettings(settings, true);

  uiAttach();
};

export default screen;
