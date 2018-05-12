let cursor = [0, 0];
const cursorElement = document.getElementById('cursor');
let cols;
let rows;
let foregroundColor;
let backgroundColor;
let defaultFgColor;
let defaultBgColor;
let context;
let scrollRect;

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

const initCanvas = () => {
  context = document
    .getElementById('canvas')
    .getContext('2d', { alpha: false });
};

export const initScreen = (newCols, newRows) => {
  rows = newRows;
  cols = newCols;
  initCanvas();
};

// https://github.com/neovim/neovim/blob/master/runtime/doc/ui.txt
export const redrawCmd = {
  put: (props) => {
    for (let i = 0; i < props.length; i += 1) {
      printChar(cursor[0], cursor[1], props[i][0]);
      cursor[1] += 1;
    }
  },

  cursor_goto: (props) => {
    [cursor] = props;
    cursorElement.style.transform = `translate(${(cursor[1] * targetCharWidth) -
      1}px, ${(cursor[0] * 15) - 1}px)`;
  },

  eol_clear: () => {
    for (let i = cursor[1]; i < cols; i += 1) {
      printChar(cursor[0], i, ' ');
    }
  },

  clear: () => {
    for (let i = 0; i < rows; i += 1) {
      for (let j = 0; j < cols; j += 1) {
        printChar(i, j, ' ');
      }
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

  update_bg: (props) => {
    defaultBgColor = getColorString(props[0]);
  },

  update_fg: (props) => {
    defaultFgColor = getColorString(props[0]);
  },

  set_scroll_region: (props) => {
    [scrollRect] = props;
    // top, bottom, left, right
  },

  scroll: (props) => {
    const scrollCount = props[0];
    const [top, bottom, left, right] = scrollRect;
    // console.log('scroll count', scrollCount);
    // console.log(top, bottom, left, right);
    const rectCopy = context.getImageData(
      left * charWidth,
      (top + (scrollCount > 0 ? scrollCount : 0)) * charHeight,
      (right - left + 1) * charWidth,
      (bottom - top + 1 - (scrollCount > 0 ? scrollCount : -scrollCount)) * charHeight,
    );
    context.putImageData(
      rectCopy,
      left * charWidth,
      (top + (scrollCount > 0 ? 0 : -scrollCount)) * charHeight,
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

export default initScreen;
