import debounce from 'lodash/debounce';

const [body] = document.getElementsByTagName('body');

let screenContainer;
let nvim;

let cursorEl;
let cursorCanvasEl;
let cursorContext;
let cursor;

let screenEl;
let canvasEl;
let context;

let scale;
let charWidth;
let charHeight;

let fontFamily;
let fontSize;
let lineHeight;
let letterSpacing;

let cols;
let rows;
let hiFgColor;
let hiBgColor;
let hiSpColor;
let hiItalic;
let hiBold;
let hiUnderline;
let hiUndercurl;
let defaultFgColor;
let defaultBgColor;
let defaultSpColor;
let reverseColor;
let scrollRect = new Array(4);
let modeInfoSet;
let mode;

let curChar;
let curBold;
let curItalic;

let showBold = true;
let showItalic = true;
let showUnderline = true;
let showUndercurl = true;

const colorsCache = {};
let charsCache = {};

export const getCursorElement = () => cursorEl;

const initCursor = (containerEl) => {
  cursorEl = document.createElement('div');
  cursorEl.style.position = 'absolute';
  cursorEl.style.zIndex = 100;
  cursorEl.style.top = 0;
  cursorEl.style.left = 0;

  cursorCanvasEl = document.createElement('canvas');

  cursorContext = cursorCanvasEl.getContext('2d', { alpha: true });

  cursorEl.appendChild(cursorCanvasEl);
  containerEl.appendChild(cursorEl);

  cursor = [0, 0];
};

const initScreen = (containerEl) => {
  screenEl = document.createElement('div');

  screenEl.style.contain = 'strict';
  screenEl.style.overflow = 'hidden';

  canvasEl = document.createElement('canvas');

  canvasEl.style.position = 'absolute';
  canvasEl.style.top = 0;
  canvasEl.style.left = 0;

  context = canvasEl.getContext('2d', { alpha: false });

  screenEl.appendChild(canvasEl);
  containerEl.appendChild(screenEl);
};

const measureCharSize = () => {
  const char = document.createElement('span');
  char.innerHTML = '0';
  char.style.fontFamily = fontFamily;
  char.style.fontSize = `${fontSize}px`;
  char.style.lineHeight = `${Math.round(fontSize * lineHeight)}px`;
  char.style.position = 'absolute';
  char.style.left = '-1000px';
  char.style.top = 0;
  screenEl.appendChild(char);

  charWidth = char.offsetWidth + letterSpacing;
  charHeight = char.offsetHeight;
  cursorCanvasEl.width = charWidth;
  cursorCanvasEl.height = charHeight;
  cursorEl.style.width = `${charWidth}px`;
  cursorEl.style.height = `${charHeight}px`;

  screenEl.removeChild(char);
  charsCache = {};
};

const fgColor = () =>
  (reverseColor ? hiBgColor || defaultBgColor : hiFgColor || defaultFgColor);

const bgColor = () =>
  (reverseColor ? hiFgColor || defaultFgColor : hiBgColor || defaultBgColor);

const spColor = () =>
  (reverseColor ? hiSpColor || defaultSpColor : hiSpColor || defaultSpColor);

const font = ({ hiItalic = false, hiBold = false }) =>
  [
    hiItalic ? 'italic' : '',
    hiBold ? 'bold' : '',
    `${fontSize}px`,
    fontFamily,
  ].join(' ');

const getCharBitmap = (char, props = {}) => {
  const p = Object.assign(
    {
      fgColor: fgColor(),
      bgColor: bgColor(),
      spColor: spColor(),
      hiItalic,
      hiBold,
      hiUnderline,
      hiUndercurl,
    },
    props,
  );
  const key = [char, ...Object.values(p)].join('-');
  if (!charsCache[key]) {
    const c = document.createElement('canvas');
    c.width = charWidth * 3;
    c.height = charHeight;
    const ctx = c.getContext('2d', { alpha: true });
    ctx.fillStyle = p.fgColor;
    ctx.font = font(p);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    if (char) {
      ctx.fillText(
        char,
        Math.round(letterSpacing / 2) + charWidth,
        charHeight / 2,
      );
    }

    if (p.hiUnderline) {
      ctx.strokeStyle = p.fgColor;
      ctx.lineWidth = scale;
      ctx.beginPath();
      ctx.moveTo(charWidth, charHeight - scale);
      ctx.lineTo(charWidth * 2, charHeight - scale);
      ctx.stroke();
    }

    if (p.hiUndercurl) {
      ctx.strokeStyle = p.spColor;
      ctx.lineWidth = fontSize * 0.08;
      const x = charWidth;
      const y = charHeight - fontSize * 0.08 / 2;
      const h = charHeight * 0.2; // Height of the wave
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(
        x + x / 4,
        y,
        x + x / 4,
        y - h / 2,
        x + x / 2,
        y - h / 2,
      );
      ctx.bezierCurveTo(
        x + x / 4 * 3,
        y - h / 2,
        x + x / 4 * 3,
        y,
        x + x,
        y,
      );
      ctx.stroke();
    }

    charsCache[key] = c;
  }
  return charsCache[key];
};

const chars = {};
const printChar = (i, j, char) => {
  if (!chars[i]) chars[i] = {};
  chars[i][j] = char;
  context.drawImage(
    getCharBitmap(char),
    0,
    0,
    charWidth * 3,
    charHeight,
    (j - 1) * charWidth,
    i * charHeight,
    charWidth * 3,
    charHeight,
  );
};

const printPrevChar = (i, j) => {
  if (chars[i][j - 1]) {
    context.drawImage(
      getCharBitmap(chars[i][j - 1]),
      charWidth * 2,
      0,
      charWidth,
      charHeight,
      j * charWidth,
      i * charHeight,
      charWidth,
      charHeight,
    );
  }
};

const getColor = (c) => {
  if (!c) return null;
  if (!colorsCache[c]) {
    // eslint-disable-next-line no-bitwise
    colorsCache[c] = `rgb(${[c >> 16, c >> 8, c].map(c => c & 0xFF).join(',')})`;
  }
  return colorsCache[c];
};

const clearCursor = () => {
  cursorContext.clearRect(0, 0, charWidth, charHeight);
};

const redrawCursor = () => {
  const m = modeInfoSet && modeInfoSet[mode];
  if (!m) return;
  clearCursor();
  if (m.cursor_shape === 'block') {
    const char = m.name.indexOf('cmdline') === -1 ? curChar : null;

    cursorEl.style.background = defaultFgColor;
    cursorContext.drawImage(
      getCharBitmap(char, {
        bgColor: defaultFgColor,
        fgColor: defaultBgColor,
        spColor: defaultBgColor,
        hiBold: curBold,
        hiItalic: curItalic,
      }),
      -charWidth,
      0,
    );
  } else if (m.cursor_shape === 'vertical') {
    cursorEl.style.background = 'none';
    const curWidth = m.cell_percentage
      ? Math.max(scale, Math.round(charWidth / 100 * m.cell_percentage))
      : scale;
    cursorContext.fillStyle = defaultFgColor;
    cursorContext.fillRect(0, 0, curWidth, charHeight);
  } else if (m.cursor_shape === 'horizontal') {
    cursorEl.style.background = 'none';
    const curHeight = m.cell_percentage
      ? Math.max(scale, Math.round(charHeight / 100 * m.cell_percentage))
      : scale;
    cursorContext.fillStyle = defaultFgColor;
    cursorContext.fillRect(0, charHeight - curHeight, charWidth, curHeight);
  }
};

const setCharUnderCursor = ({
  char,
  bold = hiBold,
  italic = hiItalic,
}) => {
  curChar = char;
  curBold = showBold && bold;
  curItalic = showItalic && italic;
  redrawCursor();
};

const charUnderCursor = () => {
  nvim.command('VVcharUnderCursor');
};

let debouncedRepositionCursor;

export const repositionCursor = () => {
  if (debouncedRepositionCursor) debouncedRepositionCursor.cancel();
  const left = cursor[1] * charWidth;
  const top = cursor[0] * charHeight;
  cursorEl.style.transform = `translate(${left}px, ${top}px)`;
  charUnderCursor();
};

debouncedRepositionCursor = debounce(repositionCursor, 20);

// https://github.com/neovim/neovim/blob/master/runtime/doc/ui.txt
const redrawCmd = {
  put: (...props) => {
    context.fillStyle = bgColor();
    context.fillRect(
      cursor[1] * charWidth,
      cursor[0] * charHeight,
      charWidth * props.length,
      charHeight,
    );
    for (let ii = props.length - 1; ii >= 0; ii -= 1) {
      // TODO what's wrong with i scope?
      printChar(cursor[0], cursor[1] + ii, props[ii][0]);
    }
    printPrevChar(cursor[0], cursor[1]);
    cursor[1] += props.length;
    clearCursor();
    debouncedRepositionCursor();
  },

  cursor_goto: (newCursor) => {
    cursor = newCursor;
    clearCursor();
    debouncedRepositionCursor();
  },

  clear: () => {
    cursor = [0, 0];
    clearCursor();
    context.fillStyle = defaultBgColor;
    context.fillRect(0, 0, canvasEl.width, canvasEl.height);
  },

  eol_clear: () => {
    const left = cursor[1] * charWidth;
    const top = cursor[0] * charHeight;
    const width = canvasEl.width - left;
    const height = charHeight;
    context.fillStyle = bgColor();
    context.fillRect(left, top, width, height);
  },

  highlight_set: (...props) => {
    for (let i = 0; i < props.length; i += 1) {
      const [
        {
          foreground,
          background,
          special,
          reverse,
          standout,
          italic,
          bold,
          underline,
          undercurl,
        },
      ] = props[i];
      reverseColor = reverse || standout;
      hiFgColor = getColor(foreground);
      hiBgColor = getColor(background);
      hiSpColor = getColor(special);
      hiItalic = showItalic && italic;
      hiBold = showBold && bold;
      hiUnderline = showUnderline && underline;
      hiUndercurl = showUndercurl && undercurl;
    }
  },

  update_bg: ([color]) => {
    defaultBgColor = getColor(color);
    body.style.background = defaultBgColor;
  },

  update_fg: ([color]) => {
    defaultFgColor = getColor(color);
  },

  update_sp: ([color]) => {
    defaultSpColor = getColor(color);
  },

  set_scroll_region: (rect) => {
    // top, bottom, left, right
    scrollRect = rect;
  },

  // https://github.com/neovim/neovim/blob/master/runtime/doc/ui.txt#L202
  scroll: ([scrollCount]) => {
    const [top, bottom, left, right] = scrollRect;

    const x = left * charWidth; // region left
    let y; // region top
    const w = (right - left + 1) * charWidth; // clipped part width
    const h = (bottom - top + 1 - Math.abs(scrollCount)) * charHeight; // clipped part height
    const X = x; // destination left
    let Y; // destination top
    const cx = x; // clear left
    let cy; // clear top
    const cw = w; // clear width
    const ch = Math.abs(scrollCount) * charHeight; // clear height
    if (scrollCount > 0) {
      // scroll up.
      y = (top + scrollCount) * charHeight;
      Y = top * charHeight;
      cy = (bottom + 1 - scrollCount) * charHeight;
    } else {
      // scroll down
      y = top * charHeight;
      Y = (top - scrollCount) * charHeight;
      cy = top * charHeight;
    }

    // Copy scrolled lines
    // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
    context.drawImage(canvasEl, x, y, w, h, X, Y, w, h);

    // Clear lines under scroll
    context.fillStyle = defaultBgColor;
    context.fillRect(cx, cy, cw, ch);
  },

  resize: (...props) => {
    [[cols, rows]] = props;
    screenEl.style.width = `${cols * charWidth}px`;
    screenEl.style.height = `${rows * charHeight}px`;
    canvasEl.width = cols * charWidth;
    canvasEl.height = rows * charHeight;
    context.fillStyle = bgColor();
    context.fillRect(0, 0, canvasEl.width, canvasEl.height);
    scrollRect = [0, rows - 1, 0, cols - 1];
  },

  // https://github.com/neovim/neovim/blob/master/runtime/doc/ui.txt#L75
  mode_info_set: (props) => {
    modeInfoSet = props[1].reduce((r, o) => ({ ...r, [o.name]: o }), {});
    redrawCursor();
  },

  mode_change: (...modes) => {
    [mode] = modes[modes.length - 1];
    redrawCursor();
  },

  mouse_on: () => {},
  mouse_off: () => {},
  set_title: () => {},
  set_icon: () => {},

  // VV specific commands
  vv_char_under_cursor: (args) => {
    setCharUnderCursor(args);
  },

  vv_fontfamily: (newFontFamily) => {
    fontFamily = newFontFamily;
    measureCharSize();
  },

  vv_fontsize: (newFontSize) => {
    fontSize = parseInt(newFontSize, 10) * scale;
    measureCharSize();
  },

  vv_letterspacing: (newLetterSpacing) => {
    letterSpacing = parseInt(newLetterSpacing, 10);
    measureCharSize();
  },

  vv_lineheight: (newLineHeight) => {
    lineHeight = parseFloat(newLineHeight);
    measureCharSize();
  },

  vv_show_bold: (value) => {
    showBold = value;
  },

  vv_show_italic: (value) => {
    showItalic = value;
  },

  vv_show_underline: (value) => {
    showUnderline = value;
  },

  vv_show_undercurl: (value) => {
    showUndercurl = value;
  },
};

const isRetina = () => true;

const screen = (containerId, newNvim) => {
  nvim = newNvim;
  screenContainer = document.getElementById(containerId);
  if (!screenContainer) return false;

  scale = isRetina() ? 2 : 1;

  screenContainer.style.position = 'absolute';
  screenContainer.style.transformOrigin = '0 0';
  screenContainer.style.transform = `scale(${1 / scale})`;

  initCursor(screenContainer);
  initScreen(screenContainer);

  nvim.subscribe('vv:char_under_cursor');

  return redrawCmd;
};

export const screenCoords = (width, height) => [
  Math.floor(width * scale / charWidth),
  Math.floor(height * scale / charHeight),
];

export default screen;
