let cursor = [0, 0];
const cursorElement = document.getElementById('cursor');
let cols;
let rows;
let foregroundColor;
let backgroundColor;
let defaultFgColor;
let defaultBgColor;
const canvasEl = document.getElementById('canvas');
const context = canvasEl.getContext('2d', { alpha: false });
let scrollRect = new Array(4);

const colorsCache = {};
const charsCache = {};

const targetCharWidth = 7.2;
const targetCharHeight = 15;
const targetFontSize = 12;
const fontFamily = 'SFMono-Light';
const scale = 2;
const charWidth = targetCharWidth * scale;
const charHeight = targetCharHeight * scale;
const fontSize = targetFontSize * scale;
const font = `${fontSize}px ${fontFamily}`;

const getCharBitmap = (char) => {
  const key = `${char}${foregroundColor}${backgroundColor}`;
  if (!charsCache[key]) {
    const c = document.createElement('canvas');
    c.width = Math.ceil(charWidth);
    c.height = Math.ceil(charHeight);
    const ctx = c.getContext('2d', { alpha: false });
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, Math.ceil(charWidth), Math.ceil(charHeight));
    ctx.fillStyle = foregroundColor;
    ctx.font = font;
    ctx.textBaseline = 'top';
    ctx.fillText(char, 0, 0);
    charsCache[key] = c;
  }
  return charsCache[key];
};

const printChar = (i, j, char) => {
  context.drawImage(
    getCharBitmap(char),
    Math.floor(j * charWidth),
    Math.floor(i * charHeight),
  );
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

// https://github.com/neovim/neovim/blob/master/runtime/doc/ui.txt
export const redrawCmd = {
  put: (props) => {
    for (let i = 0; i < props.length; i += 1) {
      printChar(cursor[0], cursor[1], props[i][0]);
      cursor[1] += 1;
    }
  },

  cursor_goto: ([newCursor]) => {
    cursor = newCursor;
    const left = (cursor[1] * targetCharWidth) - 1;
    const top = (cursor[0] * 15) - 1;
    cursorElement.style.transform = `translate(${left}px, ${top}px)`;
  },

  clear: () => {
    context.fillStyle = backgroundColor;
    context.fillRect(
      0,
      0,
      Math.ceil(cols * charWidth),
      Math.ceil(rows * charHeight),
    );
  },

  eol_clear: () => {
    for (let i = cursor[1]; i < cols; i += 1) {
      printChar(cursor[0], i, ' ');
    }
  },

  highlight_set: (props) => {
    for (let i = 0; i < props.length; i += 1) {
      const { foreground, background, reverse } = props[i][0];

      const fg = getColorString(foreground);
      const bg = getColorString(background);
      foregroundColor = reverse ? bg || defaultBgColor : fg || defaultFgColor;
      backgroundColor = reverse ? fg || defaultFgColor : bg || defaultBgColor;
    }
  },

  update_bg: ([color]) => {
    defaultBgColor = getColorString(color);
  },

  update_fg: ([color]) => {
    defaultFgColor = getColorString(color);
  },

  set_scroll_region: ([rect]) => {
    // top, bottom, left, right
    scrollRect = rect;
  },

  scroll: ([scrollCount]) => {
    const [top, bottom, left, right] = scrollRect;

    const x = left * charWidth;
    const y = (top + (scrollCount > 0 ? scrollCount : 0)) * charHeight;
    const w = (right - left + 1) * charWidth;
    const h =
      (bottom - top + 1 - (scrollCount > 0 ? scrollCount : -scrollCount)) *
      charHeight;

    context.drawImage(
      canvasEl,
      x,
      y,
      w,
      h,
      left * charWidth,
      (top + (scrollCount > 0 ? 0 : -scrollCount)) * charHeight,
      w,
      h,
    );

    if (scrollCount > 0) {
      context.fillStyle = backgroundColor;
      context.fillRect(
        left,
        (bottom + 1 - scrollCount) * charHeight,
        (right - left + 1) * charWidth,
        scrollCount * charHeight,
      );
    } else {
      context.fillStyle = backgroundColor;
      context.fillRect(
        left,
        top * charHeight,
        (right - left + 1) * charWidth,
        (top - scrollCount) * charHeight,
      );
    }
  },
};

export const initScreen = (newCols, newRows) => {
  rows = newRows;
  cols = newCols;
  redrawCmd.clear();
};

export default initScreen;
