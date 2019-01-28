import debounce from 'lodash/debounce';
import isFinite from 'lodash/isFinite';
// import log from '../../lib/log';

const [body] = document.getElementsByTagName('body');

let screenContainer;
let nvim;

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
let hiFgColor;
let hiBgColor;
let hiSpColor;
let hiItalic;
let hiBold;
let hiUnderline;
let hiUndercurl;
let fgColor = defaultFgColor;
let bgColor = defaultBgColor;
let spColor = defaultSpColor;
let reverseColor;
let scrollRect = new Array(4);
let modeInfoSet;
let mode;

let showBold = true;
let showItalic = true;
let showUnderline = true;
let showUndercurl = true;

const colorsCache = {};
let charsCache = {};

let chars = {};

const highlightTable = {};

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

  canvasEl = document.createElement('canvas');

  canvasEl.style.position = 'absolute';
  canvasEl.style.top = 0;
  canvasEl.style.left = 0;

  context = canvasEl.getContext('2d', { alpha: false });

  screenEl.appendChild(canvasEl);
  screenContainer.appendChild(screenEl);
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
  }
  screenEl.removeChild(char);
};

const debouncedMeasureCharSize = debounce(measureCharSize, 10);

const getFgColor = () => (reverseColor ? hiBgColor : hiFgColor);

const getBgColor = () => (reverseColor ? hiFgColor : hiBgColor);

const getSpColor = () => (reverseColor ? hiSpColor : hiSpColor);

const font = p => [
  p.hiItalic ? 'italic' : '',
  p.hiBold ? 'bold' : '',
  `${scaledFontSize()}px`,
  fontFamily,
].join(' ');

const getCharBitmap = (char, props) => {
  const p = props || {
    fgColor: getFgColor(),
    bgColor: getBgColor(),
    spColor: getSpColor(),
    hiItalic,
    hiBold,
    hiUnderline,
    hiUndercurl,
  };
  // Constructing key with string template appears much faster than array join
  const key = `${char}-${p.fgColor}-${p.bgColor}-${p.spColor}-${p.hiItalic}-${p.hiBold}-${p.hiUnderline}-${p.hiUndercurl}`;

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
        Math.round(scaledLetterSpacing() / 2) + charWidth,
        Math.round(charHeight / 2),
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
      ctx.lineWidth = scaledFontSize() * 0.08;
      const x = charWidth;
      const y = charHeight - (scaledFontSize() * 0.08) / 2;
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
        x + (x / 4) * 3,
        y - h / 2,
        x + (x / 4) * 3,
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

const printChar = (i, j, char, hlId) => {
  if (!chars[i]) chars[i] = {};

  if (isFinite(hlId)) {
    const props = highlightTable[hlId].calculated;
    chars[i][j] = {
      char,
      bitmap: getCharBitmap(char, props),
      bg: props.bgColor,
      italic: props.hiItalic,
      bold: props.hiBold,
      hlId,
      needsRedraw: false,
    };
  } else {
    chars[i][j] = {
      bitmap: getCharBitmap(char),
      bg: getBgColor(),
      char,
      italic: hiItalic,
      bold: hiBold,
      needsRedraw: false,
    };
  }

  // If this is the last col, fill the next char on extra col with it's bg
  if (j === cols - 1) {
    const rect = [cols * charWidth, i * charHeight, charWidth, charHeight];
    if (chars[i][j]) {
      context.fillStyle = chars[i][j].bg;
      context.fillRect(...rect);
    } else {
      context.clearRect(...rect);
    }
  }
  context.drawImage(
    chars[i][j].bitmap,
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

// If char previous to the current cursor is wider that char width, we need to draw that part
// of it that overlaps the current cursor when we redraw it.
const overlapPrev = ([i, j]) => {
  if (chars[i] && chars[i][j - 1] && !chars[i][j - 1].needsRedraw) {
    context.drawImage(
      chars[i][j - 1].bitmap,
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

// Same with next
const overlapNext = ([i, j]) => {
  if (chars[i] && chars[i][j + 1] && !chars[i][j + 1].needsRedraw) {
    context.drawImage(
      chars[i][j + 1].bitmap,
      0,
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

// Clean char from previous overlapping left and right symbols.
const cleanOverlap = ([i, j]) => {
  if (chars[i] && chars[i][j] && !chars[i][j].needsRedraw) {
    context.fillStyle = chars[i][j].bg;
    context.fillRect(j * charWidth, i * charHeight, charWidth, charHeight);
    context.drawImage(
      chars[i][j].bitmap,
      charWidth,
      0,
      charWidth,
      charHeight,
      j * charWidth,
      i * charHeight,
      charWidth,
      charHeight,
    );
    overlapPrev([i, j]);
    overlapNext([i, j]);
  }
};

const getColor = (c, defaultColor = null) => {
  if (typeof c !== 'number' || c === -1) return defaultColor;
  if (!colorsCache[c]) {
    colorsCache[c] = `rgb(${[c >> 16, c >> 8, c] // eslint-disable-line no-bitwise
      .map(cc => cc & 0xff) // eslint-disable-line no-bitwise
      .join(',')})`;
  }
  return colorsCache[c];
};

const clearCursor = () => {
  cursorContext.clearRect(0, 0, charWidth, charHeight);
};

const redrawCursor = async () => {
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

  // Default cursor colors if no hl_id is set
  const highlightAttrs = highlightTable[0] ? {
    bgColor: highlightTable[0].calculated.fgColor,
    fgColor: highlightTable[0].calculated.bgColor,
    spColor: highlightTable[0].calculated.bgColor,
    hiBold: cursorChar.bold,
    hiItalic: cursorChar.italic,
  } : {
    bgColor: fgColor,
    fgColor: bgColor,
    spColor: bgColor,
    hiBold: cursorChar.bold,
    hiItalic: cursorChar.italic,
  };

  // TODO: check this
  // Get custom cursor colors if hl_id is set
  if (m.hl_id) {
    // TODO: tmp code. getHighlightById when it will be available
    // TODO: async command does not work with r mode, it fires only after symbol was replaced
    const hiAttrsResult = await nvim.commandOutput(
      `VVhighlightAttrs ${m.hl_id}`,
    );
    if (hiAttrsResult) {
      let hiAttrs;
      try {
        hiAttrs = JSON.parse(hiAttrsResult.replace(/'/g, '"'));
      } catch (e) {} // eslint-disable-line no-empty
      if (hiAttrs) {
        const reverse = hiAttrs.reverse || hiAttrs.standout;
        if (hiAttrs.fg) highlightAttrs.fgColor = reverse ? hiAttrs.bg : hiAttrs.fg;
        if (hiAttrs.bg) highlightAttrs.bgColor = reverse ? hiAttrs.fg : hiAttrs.bg;
        if (hiAttrs.sp) highlightAttrs.spColor = hiAttrs.bg;
        highlightAttrs.hiBold = showBold && !!hiAttrs.bold;
        highlightAttrs.hiItalic = showItalic && !!hiAttrs.italic;
      }
    }
  }

  if (m.cursor_shape === 'block') {
    const char = m.name.indexOf('cmdline') === -1 ? cursorChar.char : null;
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

export const repositionCursor = (newCursor) => {
  if (debouncedRepositionCursor) debouncedRepositionCursor.cancel();
  if (newCursor) cursor = newCursor;
  const left = cursor[1] * charWidth;
  const top = cursor[0] * charHeight;
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

const recalculateHighlightTable = () => {
  if (highlightTable[0]) {
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
          hiItalic: showItalic && italic,
          hiBold: showBold && bold,
          hiUnderline: showUnderline && underline,
          hiUndercurl: showUndercurl && undercurl,
        };
      }
    });
  }
};

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

// https://github.com/neovim/neovim/blob/master/runtime/doc/ui.txt
const redrawCmd = {
  put: (...props) => {
    // Fill background for the whole set of chars
    context.fillStyle = getBgColor();
    context.fillRect(
      cursor[1] * charWidth,
      cursor[0] * charHeight,
      charWidth * props.length,
      charHeight,
    );

    // Then print chars on that place
    for (let ii = props.length - 1; ii >= 0; ii -= 1) {
      // TODO what's wrong with i scope?
      printChar(cursor[0], cursor[1] + ii, props[ii][0]);
    }

    cleanOverlap([cursor[0], cursor[1] - 1]);
    overlapPrev(cursor);

    cursor[1] += props.length;

    overlapNext([cursor[0], cursor[1] - 1]);
    cleanOverlap(cursor);

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
    context.fillStyle = highlightTable[0] ? highlightTable[0].calculated.bgColor : bgColor;
    context.fillRect(0, 0, canvasEl.width, canvasEl.height);
    chars = {};
  },

  eol_clear: () => {
    for (let i = cursor[1]; i < cols; i += 1) {
      chars[cursor[0]][i] = null;
    }
    cleanOverlap([cursor[0], cursor[1] - 1]);
    const left = cursor[1] * charWidth;
    const top = cursor[0] * charHeight;
    const width = canvasEl.width - left;
    const height = charHeight;
    context.fillStyle = getBgColor();
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
      hiFgColor = getColor(foreground, fgColor);
      hiBgColor = getColor(background, bgColor);
      hiSpColor = getColor(special, spColor);
      hiItalic = showItalic && italic;
      hiBold = showBold && bold;
      hiUnderline = showUnderline && underline;
      hiUndercurl = showUndercurl && undercurl;
    }
  },

  update_bg: ([color]) => {
    bgColor = getColor(color, defaultBgColor);
    body.style.background = bgColor;
  },

  update_fg: ([color]) => {
    fgColor = getColor(color, defaultFgColor);
  },

  update_sp: ([color]) => {
    spColor = getColor(color, defaultSpColor);
  },

  set_scroll_region: (...rects) => {
    const rect = rects[rects.length - 1];
    scrollRect = rect; // top, bottom, left, right
  },

  // https://github.com/neovim/neovim/blob/master/runtime/doc/ui.txt#L202
  scroll: ([scrollCount]) => {
    const [top, bottom, left, right] = scrollRect;

    const x = left * charWidth; // region left
    let y; // region top
    let w = (right - left + 1) * charWidth; // clipped part width
    const h = (bottom - top + 1 - Math.abs(scrollCount)) * charHeight; // clipped part height
    const X = x; // destination left
    let Y; // destination top
    const cx = x; // clear left
    let cy; // clear top
    let cw = w; // clear width
    const ch = Math.abs(scrollCount) * charHeight; // clear height

    if (right === cols - 1) {
      // Add extra char if it is far right rect
      w += charWidth;
      cw += charWidth;
    }

    if (scrollCount > 0) {
      // scroll down
      y = (top + scrollCount) * charHeight;
      Y = top * charHeight;
      cy = (bottom + 1 - scrollCount) * charHeight;
    } else {
      // scroll up
      y = top * charHeight;
      Y = (top - scrollCount) * charHeight;
      cy = top * charHeight;
    }

    // Copy scrolled lines
    // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
    context.drawImage(canvasEl, x, y, w, h, X, Y, w, h);

    // Clear lines under scroll
    context.fillStyle = bgColor;
    context.fillRect(cx, cy, cw, ch);

    // Scroll chars hash
    let clearCharsFrom = top;
    let clearCharsTo = bottom;

    const iterateJ = (i) => {
      for (let j = left; j <= right; j += 1) {
        if (!chars[i]) chars[i] = {};
        if (chars[i + scrollCount] && chars[i + scrollCount][j]) {
          chars[i][j] = chars[i + scrollCount][j];
        } else {
          chars[i][j] = null;
        }
      }
    };
    if (scrollCount > 0) {
      // scroll down
      for (let i = top; i <= bottom - scrollCount; i += 1) {
        iterateJ(i);
      }
      clearCharsFrom = bottom - scrollCount + 1;
    } else {
      // scroll up
      for (let i = bottom; i >= top - scrollCount; i -= 1) {
        iterateJ(i);
      }
      clearCharsTo = top - scrollCount - 1;
    }

    for (let i = clearCharsFrom; i <= clearCharsTo; i += 1) {
      for (let j = left; j <= right; j += 1) {
        if (chars[i] && chars[i][j]) {
          chars[i][j] = null;
        }
      }
    }
  },

  resize: (...props) => {
    [[cols, rows]] = props;
    // Add extra column on the right to fill it with adjacent color to have a nice right border
    screenEl.style.width = `${(cols + 1) * charWidth}px`;
    screenEl.style.height = `${rows * charHeight}px`;
    canvasEl.width = (cols + 1) * charWidth;
    canvasEl.height = rows * charHeight;
    context.fillStyle = getBgColor();
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

  option_set: (...options) => {
    options.forEach(([option, value]) => {
      if (optionSet[option]) {
        optionSet[option](value);
      } else {
        // console.warn('Unknown option', option, value); // eslint-disable-line no-console
      }
    });
  },

  // New api
  grid_resize: (props) => {
    cols = props[1];
    rows = props[2];
    // Add extra column on the right to fill it with adjacent color to have a nice right border
    screenEl.style.width = `${(cols + 1) * charWidth}px`;
    screenEl.style.height = `${rows * charHeight}px`;
    canvasEl.width = (cols + 1) * charWidth;
    canvasEl.height = rows * charHeight;
    context.fillStyle = getBgColor();
    context.fillRect(0, 0, canvasEl.width, canvasEl.height);
    scrollRect = [0, rows - 1, 0, cols - 1];
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

  grid_line: (...props) => {
    props.forEach(([_grid, row, col, cells]) => {
      // eslint-disable-line no-unused-vars
      let lineLength = 0;

      // Fill background for the whole set of chars
      // TODO: refactor
      let currentHlId;
      cells.forEach(([char, hlId, length = 1]) => { // eslint-disable-line no-unused-vars
        if (isFinite(hlId)) {
          currentHlId = hlId;
        }
        context.fillStyle = highlightTable[currentHlId].calculated.bgColor;
        Array.from({ length }, (_v, i) => context.fillRect(
          (col + lineLength + i) * charWidth,
          row * charHeight,
          charWidth,
          charHeight,
        ));
        lineLength += length;
      });

      lineLength = 0;
      currentHlId = undefined;
      cells.forEach(([char, hlId, length = 1]) => {
        if (isFinite(hlId)) {
          currentHlId = hlId;
        }
        Array.from(
          { length },
          (_v, i) => printChar(row, col + lineLength + i, char, currentHlId),
        );
        lineLength += length;
      });

      cleanOverlap([row, col - 1]);
      overlapPrev([row, col]);

      overlapNext([row, col + lineLength - 1]);
      cleanOverlap([row, col + lineLength]);
    });
    redrawChars();
  },

  grid_clear: () => {
    cursor = [0, 0];
    context.fillStyle = highlightTable[0] ? highlightTable[0].calculated.bgColor : defaultBgColor;
    context.fillRect(0, 0, canvasEl.width, canvasEl.height);
    chars = {};
  },

  hl_attr_define: (...props) => {
    props.forEach(([id, value]) => {
      highlightTable[id] = {
        value,
      };
    });
    recalculateHighlightTable();
  },

  grid_cursor_goto: ([_grid, ...newCursor]) => {
    if (newCursor[0] !== cursor[0] && newCursor[0] === rows - 1) {
      debouncedRepositionCursor(newCursor);
    } else {
      repositionCursor(newCursor);
    }
  },

  grid_scroll: ([_grid, top, bottom, left, right, scrollCount]) => {
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

    const iterateJ = (i) => {
      for (let j = left; j <= right - 1; j += 1) {
        if (!chars[i]) chars[i] = {};
        if (chars[i + scrollCount] && chars[i + scrollCount][j]) {
          chars[i][j] = chars[i + scrollCount][j];
        } else {
          chars[i][j] = null;
        }
      }
    };
    if (scrollCount > 0) {
      // scroll down
      for (let i = top; i <= bottom - scrollCount - 1; i += 1) {
        iterateJ(i);
      }
    } else {
      // scroll up
      for (let i = bottom - 1; i >= top - scrollCount; i -= 1) {
        iterateJ(i);
      }
    }
  },

  flush: () => {
  },

  // VV specific commands
  vv_fontfamily: (newFontFamily) => {
    fontFamily = newFontFamily;
    debouncedMeasureCharSize();
  },

  vv_fontsize: (newFontSize) => {
    fontSize = parseInt(newFontSize, 10);
    debouncedMeasureCharSize();
  },

  vv_letterspacing: (newLetterSpacing) => {
    letterSpacing = parseInt(newLetterSpacing, 10);
    debouncedMeasureCharSize();
  },

  vv_lineheight: (newLineHeight) => {
    lineHeight = parseFloat(newLineHeight);
    debouncedMeasureCharSize();
  },

  vv_bold: (value) => {
    showBold = value;
  },

  vv_italic: (value) => {
    showItalic = value;
  },

  vv_underline: (value) => {
    showUnderline = value;
  },

  vv_undercurl: (value) => {
    showUndercurl = value;
  },
};

const handleNotification = async (method, args) => {
  if (method === 'redraw') {
    for (let i = 0; i < args.length; i += 1) {
      const [cmd, ...props] = args[i];
      if (redrawCmd[cmd]) {
        redrawCmd[cmd](...props);
      } else {
        console.warn('Unknown redraw command', cmd, props); // eslint-disable-line no-console
      }
    }
  }
};

const setScale = () => {
  scale = isRetina() ? RETINA_SCALE : 1;
  screenContainer.style.transform = `scale(${1 / scale})`;
  screenContainer.style.width = `${scale * 100}%`;
  screenContainer.style.height = `${scale * 100}%`;
};

const screen = (containerId, newNvim) => {
  nvim = newNvim;
  screenContainer = document.getElementById(containerId);
  if (!screenContainer) return false;

  screenContainer.style.position = 'absolute';
  screenContainer.style.transformOrigin = '0 0';

  setScale();

  initScreen();
  initCursor();
  measureCharSize();

  nvim.on('notification', handleNotification);

  // Detect when you drag between retina/non-retina displays
  window
    .matchMedia('screen and (min-resolution: 2dppx)')
    .addListener(async () => {
      canvasEl.style.opacity = 0;
      setScale();
      measureCharSize();
      await nvim.uiTryResize(cols, rows);
      canvasEl.style.opacity = 1;
    });

  return redrawCmd;
};

export const screenCoords = (width, height, checkCharSize = false) => {
  if (checkCharSize) {
    debouncedMeasureCharSize.flush();
  }
  return [
    Math.floor((width * scale) / charWidth),
    Math.floor((height * scale) / charHeight),
  ];
};

export default screen;
