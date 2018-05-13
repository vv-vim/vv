let cursor = [0, 0];
const cursorElement = document.getElementById('cursor');
let cols;
let rows;
let foregroundColor;
let backgroundColor;
let defaultFgColor;
let defaultBgColor;
const context = document
  .getElementById('canvas')
  .getContext('2d', { alpha: false });
let scrollRect = new Array(4);
let screenContainer = document.getElementById('screenContainer');

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

let currentScroll = 0;

// const scrollContainer = document.getElementById('scrollContainer');
// const scrollCanvas = document.getElementById('scroll');
// const scrollContext = scrollCanvas.getContext('2d', { alpha: true });

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

const findScrollWindow = (i, j) => {
  const keys = Object.keys(scrollWindow);
  for (let i = 0; i < keys.length; i += 1) {
    const win = scrollWindow[keys[i]];
    const [top, bottom, left, right] = win.rect;
    if (i > top && i < bottom && j > left && j < right) {
      return win;
    }
  }
}

const printChar = (i, j, char) => {
  // const win = findScrollWindow(i, j);
  // console.log('hey win', win);
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

const rectEq = (rect1, rect2) =>
  rect1[0] === rect2[0] &&
  rect1[1] === rect2[1] &&
  rect1[2] === rect2[2] &&
  rect1[3] === rect2[3];

export const initScreen = (newCols, newRows) => {
  rows = newRows;
  cols = newCols;
  redrawCmd.clear();
};

let scrollWindows = {};
const scrollWindow = (rect) => {
  const [top, bottom, left, right] = rect;
  const key = rect.join('-');

  if (!scrollWindows[key]) {
    const scrollContainer = document.createElement('div');
    scrollContainer.classList.add('scrollContainer');
    screenContainer.appendChild(scrollContainer);

    const scrollCanvas = document.createElement('canvas');
    scrollCanvas.classList.add('scroll');
    scrollContainer.appendChild(scrollCanvas);
    const scrollContext = scrollCanvas.getContext('2d', { alpha: true });

    scrollContainer.style.transform = `translate(${
      left * targetCharWidth}px, ${
      top * targetCharHeight}px)`;
    scrollContainer.style.width = `${(right - left + 1) * targetCharWidth}px`;
    scrollContainer.style.height = `${(bottom - top + 1) * targetCharHeight}px`;

    scrollCanvas.width = (right - left + 1) * charWidth;
    scrollCanvas.height = (bottom - top + 1 + 50) * charHeight;

    // const rectCopy = context.getImageData(
    //   left * charWidth,
    //   top * charHeight,
    //   (right - left + 1) * charWidth,
    //   (bottom - top + 1) * charHeight,
    // );
    // scrollContext.putImageData(rectCopy, 0, 0);
    //
    scrollWindows[key] = { scrollCanvas, scrollContainer, scrollContext, rect };
  }
  return scrollWindows[key];
};

export const refreshWindows = (windows) => {
  for (let i = 0; i < windows.length; i += 1) {
    scrollWindow(windows[i]);
  }
  const newKeys = windows.map(rect => rect.join('-'));
  const keys = Object.keys(scrollWindows);
  const newScrollWindows = {};
  console.log('hey scrollWindows', scrollWindows);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (newKeys.includes(key)) {
      newScrollWindows[key] = scrollWindows[key];
    } else {
      scrollWindows[key].scrollContainer.parentNode.removeChild(scrollWindows[key].scrollContainer);
    }
  }
  scrollWindows = newScrollWindows;
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
    cursorElement.style.transform = `translate(${
      (cursor[1] * targetCharWidth) - 1}px, ${
      (cursor[0] * 15) - 1}px)`;
  },

  clear: () => {
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, Math.ceil(cols * charWidth), Math.ceil(rows * charHeight));
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

  update_bg: (props) => {
    defaultBgColor = getColorString(props[0]);
  },

  update_fg: (props) => {
    defaultFgColor = getColorString(props[0]);
  },

  set_scroll_region: (props) => {
    // top, bottom, left, right
    if (
      rectEq(props[0], [0, rows - 1, 0, cols - 1]) ||
      rectEq(props[0], scrollRect)
    ) {
      return;
    }

    [scrollRect] = props;
    const { scrollContainer, scrollCanvas, scrollContext } = scrollWindow(scrollRect);
    const [top, bottom, left, right] = scrollRect;
    // scrollContainer.style.transform = `translate(${top *
    //   targetCharHeight}px, ${left * targetCharWidth}px)`;
    // scrollContainer.style.width = `${(right - left + 1) * targetCharWidth}px`;
    // scrollContainer.style.height = `${(bottom - top + 1) * targetCharHeight}px`;
    //
    // scrollCanvas.width = (right - left + 1) * charWidth;
    // scrollCanvas.height = (bottom - top + 1 + 100) * charHeight;
    console.log('rect init', scrollRect);

    const rectCopy = context.getImageData(
      left * charWidth,
      top * charHeight,
      (right - left + 1) * charWidth,
      (bottom - top + 1) * charHeight,
    );
    scrollContext.putImageData(rectCopy, 0, 0);
    currentScroll = 0;
  },

  scroll: (props) => {
    const scrollCount = props[0];
    const [top, bottom, left, right] = scrollRect;

    currentScroll -= scrollCount;

    const { scrollContainer, scrollCanvas, scrollContext } = scrollWindow(scrollRect);
    scrollContainer.scrollTop = - currentScroll * targetCharHeight;
    // scrollCanvas.style.transform = `translateY(${currentScroll * targetCharHeight}px) scale(0.5)`;

    console.log(currentScroll)
    // scrollCanvas.height = (bottom - top + 1 - currentScroll) * charHeight;

    // const rectCopy = context.getImageData(
    //   left * charWidth,
    //   top * charHeight,
    //   (right - left + 1) * charWidth,
    //   (bottom - top + 1) * charHeight,
    // );
    // scrollContext.putImageData(rectCopy, 0, 0);

    context.fillStyle = 'rgb(255,0,0)';//backgroundColor;
    context.fillRect(
      left * charWidth,
      (bottom - top + 1 - scrollCount) * charHeight,
      (right - left + 1) * charWidth,
      scrollCount * charHeight,
    );

    // const rectCopy = context.getImageData(
    //   left * charWidth,
    //   (top + (scrollCount > 0 ? scrollCount : 0)) * charHeight,
    //   (right - left + 1) * charWidth,
    //   (bottom - top + 1 - (scrollCount > 0 ? scrollCount : -scrollCount)) *
    //     charHeight,
    // );
    // context.putImageData(
    //   rectCopy,
    //   left * charWidth,
    //   (top + (scrollCount > 0 ? 0 : -scrollCount)) * charHeight,
    // );
    //
    // if (scrollCount > 0) {
    //   context.fillStyle = backgroundColor;
    //   context.fillRect(
    //     left,
    //     (bottom + 1 - scrollCount) * charHeight,
    //     (right - left + 1) * charWidth,
    //     scrollCount * charHeight,
    //   );
    // } else {
    //   context.fillStyle = backgroundColor;
    //   context.fillRect(
    //     left,
    //     top * charHeight,
    //     (right - left + 1) * charWidth,
    //     (top - scrollCount) * charHeight,
    //   );
    // }
  },
};

export default initScreen;
