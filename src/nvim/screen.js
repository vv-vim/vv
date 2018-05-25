const [body] = document.getElementsByTagName('body');

let screenContainer;

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

const initCursor = (containerEl) => {
  cursorEl = document.createElement('div');
  cursorEl.style.display = 'block';
  cursorEl.style.position = 'absolute';
  cursorEl.style.zIndex = 100;
  cursorEl.style.position = 'absolute';
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
  char.style.lineHeight = `${lineHeight}px`;
  char.style.position = 'absolute';
  char.style.left = '-1000px';
  char.style.top = 0;
  screenEl.appendChild(char);

  charWidth = char.offsetWidth + letterSpacing;
  charHeight = char.offsetHeight;
  cursorCanvasEl.width = charWidth;
  cursorCanvasEl.height = charHeight;

  screenEl.removeChild(char);
};

const setFontStyle = (newFontFamily = 'monospace', newFontSize = 12, newLineHeight, newLetterSpacing) => {
  fontFamily = newFontFamily; // 'SFMono-Light';
  fontSize = newFontSize * scale;
  letterSpacing = (newLetterSpacing || 0);
  lineHeight = Math.round((newLineHeight || newFontSize * 1.25) * scale);
  measureCharSize();
};

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
let curUnderline;
let curUndercurl;

let showBold = true;
let showItalic = true;
let showUnderline = true;
let showUndercurl = true;

const colorsCache = {};
const charsCache = {};

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
    c.width = charWidth;
    c.height = charHeight;
    const ctx = c.getContext('2d', { alpha: false });
    ctx.fillStyle = p.bgColor;
    ctx.fillRect(0, 0, charWidth, charHeight);
    ctx.fillStyle = p.fgColor;
    ctx.font = font(p);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    if (char) {
      ctx.fillText(char, Math.round(letterSpacing / 2), charHeight / 2);
    }

    if (p.hiUnderline) {
      ctx.strokeStyle = p.fgColor;
      ctx.lineWidth = scale;
      ctx.beginPath();
      ctx.moveTo(0, charHeight - scale);
      ctx.lineTo(charWidth, charHeight - scale);
      ctx.stroke();
    }

    if (p.hiUndercurl) {
      ctx.strokeStyle = p.spColor;
      ctx.lineWidth = scale;
      const x = charWidth;
      const y = charHeight - scale / 2;
      const h = charWidth / 2; // Height of the wave
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(x / 4, y, x / 4, y - h / 2, x / 2, y - h / 2);
      ctx.bezierCurveTo(x / 4 * 3, y - h / 2, x / 4 * 3, y, x, y);
      ctx.stroke();
    }

    charsCache[key] = c;
  }
  return charsCache[key];
};

const printChar = (i, j, char) => {
  context.drawImage(getCharBitmap(char), j * charWidth, i * charHeight);
};

const getColorString = (rgb) => {
  if (!rgb) {
    return null;
  }
  if (!colorsCache[rgb]) {
    const bgr = [];
    for (let i = 0; i < 3; i += 1) {
      bgr.push(rgb & 0xff); // eslint-disable-line no-bitwise
      rgb >>= 8; // eslint-disable-line no-param-reassign, no-bitwise
    }
    colorsCache[rgb] = `rgb(${bgr[2]},${bgr[1]},${bgr[0]})`;
  }
  return colorsCache[rgb];
};

const redrawCursor = () => {
  const m = modeInfoSet && modeInfoSet[mode];
  if (!m) return;
  if (m.cursor_shape === 'block') {
    const char = m.name.indexOf('cmdline') === -1 ? curChar : null;

    cursorContext.drawImage(
      getCharBitmap(char, {
        bgColor: defaultFgColor,
        fgColor: defaultBgColor,
        hiBold: curBold,
        hiItalic: curItalic,
        hiUnderline: curUnderline,
        hiUndercurl: curUndercurl,
      }),
      0,
      0,
    );
  } else if (m.cursor_shape === 'vertical') {
    const curWidth = m.cell_percentage
      ? Math.max(scale, Math.round(charWidth / 100 * m.cell_percentage))
      : scale;
    cursorContext.clearRect(0, 0, charWidth, charHeight);
    cursorContext.fillStyle = defaultFgColor;
    cursorContext.fillRect(0, 0, curWidth, charHeight);
  } else if (m.cursor_shape === 'horizontal') {
    const curHeight = m.cell_percentage
      ? Math.max(scale, Math.round(charHeight / 100 * m.cell_percentage))
      : scale;
    cursorContext.clearRect(0, 0, charWidth, charHeight);
    cursorContext.fillStyle = defaultFgColor;
    cursorContext.fillRect(0, charHeight - curHeight, charWidth, curHeight);
  }

  cursorEl.style.display = 'block';
};

const setCharUnderCursor = ({
  char,
  bold = hiBold,
  italic = hiItalic,
  underline = hiUnderline,
  undercurl = hiUndercurl,
}) => {
  curChar = char;
  curBold = bold;
  curItalic = italic;
  curUnderline = underline;
  curUndercurl = undercurl;
  redrawCursor();
};

const refreshCursor = () => {
  const left = Math.floor(cursor[1] * charWidth);
  const top = cursor[0] * charHeight;
  cursorEl.style.transform = `translate(${left}px, ${top}px)`;
  cursorEl.style.display = 'none';
};

// https://github.com/neovim/neovim/blob/master/runtime/doc/ui.txt
const redrawCmd = {
  put: (...props) => {
    for (let i = 0; i < props.length; i += 1) {
      printChar(cursor[0], cursor[1], props[i][0]);
      cursor[1] += 1;
      refreshCursor();
    }
  },

  cursor_goto: (newCursor) => {
    cursor = newCursor;
    refreshCursor();
  },

  clear: () => {
    cursor = [0, 0];
    context.fillStyle = defaultBgColor;
    context.fillRect(0, 0, canvasEl.width, canvasEl.height);
  },

  eol_clear: () => {
    const left = cursor[1] * charWidth;
    const top = cursor[0] * charHeight;
    const width = canvasEl.width - left;
    const height = charHeight;
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
          italic,
          bold,
          underline,
          undercurl,
        },
      ] = props[i];
      reverseColor = reverse;
      hiFgColor = getColorString(foreground);
      hiBgColor = getColorString(background);
      hiSpColor = getColorString(special);
      hiItalic = showItalic && italic;
      hiBold = showBold && bold;
      hiUnderline = showUnderline && underline;
      hiUndercurl = showUndercurl && undercurl;
    }
  },

  update_bg: (color) => {
    defaultBgColor = getColorString(color);
    body.style.background = defaultBgColor;
  },

  update_fg: (color) => {
    defaultFgColor = getColorString(color);
  },

  update_sp: (color) => {
    defaultSpColor = getColorString(color);
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
  },

  // https://github.com/neovim/neovim/blob/master/runtime/doc/ui.txt#L75
  mode_info_set: (props) => {
    modeInfoSet = props[1].reduce((r, o) => ({ ...r, [o.name]: o }), {});
    refreshCursor();
  },

  mode_change: ([newMode]) => {
    mode = newMode;
    refreshCursor();
    redrawCursor();
  },

  // https://github.com/neovim/neovim/blob/master/runtime/doc/ui.txt#L128
  mouse_on: () => {},
  mouse_off: () => {},

  // VV specific commands
  vv_char_under_cursor: (args) => {
    setCharUnderCursor(args);
  },

  vv_font_style: (newFontFamily, newFontSize, newLineHeight, newLetterSpacing) => {
    setFontStyle(newFontFamily, newFontSize, newLineHeight, newLetterSpacing);
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

const screen = (containerId) => {
  screenContainer = document.getElementById(containerId);
  if (!screenContainer) return false;

  scale = isRetina() ? 2 : 1;

  screenContainer.style.position = 'relative';
  screenContainer.style.transformOrigin = '0 0';
  screenContainer.style.transform = `scale(${1 / scale})`;

  initCursor(screenContainer);
  initScreen(screenContainer);

  setFontStyle();

  return redrawCmd;
};

export const screenCoords = (width, height) => [
  Math.floor(width * scale / charWidth),
  Math.floor(height * scale / charHeight),
];

export default screen;
