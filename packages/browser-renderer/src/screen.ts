import isEqual from 'lodash/isEqual';

import emojiRegex from 'emoji-regex';

import { getColor } from 'src/lib/getColor';

import type { Settings } from 'src/types';
import type {
  Nvim,
  Transport,
  UiEventsHandlers,
  UiEventsArgs,
  ModeInfo,
  HighlightAttrs,
} from '@vvim/nvim';

export type Screen = {
  screenCoords: (width: number, height: number) => [number, number];
  getCursorElement: () => HTMLDivElement;
};

type CalculatedProps = {
  bgColor: string;
  fgColor: string;
  spColor?: string;
  hiItalic: boolean;
  hiBold: boolean;
  hiUnderline: boolean;
  hiUndercurl: boolean;
  hiStrikethrough: boolean;
};

type HighlightProps = {
  calculated?: CalculatedProps;
  value?: HighlightAttrs;
};

type HighlightTable = Record<number, HighlightProps>;

type Char = {
  bitmap?: HTMLCanvasElement;
  char?: string | null;
  hlId?: number;
};

const DEFAULT_FONT_FAMILY = 'Courier New';

const DEFAULT_FG_COLOR = 'rgb(255,255,255)';
const DEFAULT_BG_COLOR = 'rgb(0,0,0)';
const DEFAULT_SP_COLOR = 'rgb(255,255,255)';
const DEFAULT_FONT_SIZE = 12;
const DEFAULT_LINE_HEIGHT = 1.25;
const DEFAULT_LETTER_SPACING = 0;

let cursorAnimation: Animation;

const isEmoji = (char: string): boolean => {
  const regex = emojiRegex();
  return !!char.match(regex);
};

const screen = ({
  settings,
  transport,
  nvim,
}: {
  settings: Settings;
  transport: Transport;
  nvim: Nvim;
}): Screen => {
  let screenContainer: HTMLDivElement;
  let cursorEl: HTMLDivElement;

  let canvasEl: HTMLCanvasElement;
  let context: CanvasRenderingContext2D;

  let cursorCanvasEl: HTMLCanvasElement;
  let cursorContext: CanvasRenderingContext2D;

  let cursorPosition: [number, number] = [0, 0];
  let cursorChar: string;

  let scale: number;
  let charWidth: number;
  let charHeight: number;

  let fontFamily = DEFAULT_FONT_FAMILY;
  let fontSize = DEFAULT_FONT_SIZE;
  let lineHeight = DEFAULT_LINE_HEIGHT;
  let letterSpacing = DEFAULT_LETTER_SPACING;

  let cols: number;
  let rows: number;

  let modeInfoSet: Record<string, ModeInfo>;
  let mode: string;

  let showBold = true;
  let showItalic = true;
  let showUnderline = true;
  let showUndercurl = true;
  let showStrikethrough = true;

  let chars: Char[][] = [];

  const highlightTable: HighlightTable = {
    '0': {
      calculated: {
        bgColor: DEFAULT_BG_COLOR,
        fgColor: DEFAULT_FG_COLOR,
        spColor: DEFAULT_SP_COLOR,
        hiItalic: false,
        hiBold: false,
        hiUnderline: false,
        hiUndercurl: false,
        hiStrikethrough: false,
      },
    },
    // Inverted default color for cursor
    '-1': {
      calculated: {
        bgColor: DEFAULT_FG_COLOR,
        fgColor: DEFAULT_BG_COLOR,
        spColor: DEFAULT_SP_COLOR,
        hiItalic: false,
        hiBold: false,
        hiUnderline: false,
        hiUndercurl: false,
        hiStrikethrough: false,
      },
    },
  };

  let isResizing = false;
  let isResizingTimeout: NodeJS.Timeout | undefined;

  const setResizing = () => {
    isResizing = true;
    if (isResizingTimeout) {
      clearTimeout(isResizingTimeout);
      isResizingTimeout = undefined;
    }
    isResizingTimeout = setTimeout(() => {
      isResizing = false;
    }, 300);
  };

  const getCursorElement = (): HTMLDivElement => cursorEl;

  const initCursor = () => {
    cursorEl = document.createElement('div');
    cursorEl.style.position = 'absolute';
    cursorEl.style.zIndex = '100';
    cursorEl.style.top = '0';
    cursorEl.style.left = '0';

    screenContainer.appendChild(cursorEl);

    cursorCanvasEl = document.createElement('canvas');

    cursorCanvasEl.style.position = 'absolute';
    cursorCanvasEl.style.top = '0px';
    cursorCanvasEl.style.left = '0px';

    cursorContext = cursorCanvasEl.getContext('2d', { alpha: true }) as CanvasRenderingContext2D;

    cursorEl.appendChild(cursorCanvasEl);
  };

  const initScreen = () => {
    screenContainer = document.createElement('div');
    document.body.appendChild(screenContainer);

    screenContainer.style.position = 'absolute';
    screenContainer.style.left = '0';
    screenContainer.style.top = '0';
    screenContainer.style.transformOrigin = '0 0';

    canvasEl = document.createElement('canvas');

    canvasEl.style.position = 'absolute';
    canvasEl.style.top = '0px';
    canvasEl.style.left = '0px';

    context = canvasEl.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;

    screenContainer.appendChild(canvasEl);
  };

  const RETINA_SCALE = 2;

  const charsCache: Map<string, HTMLCanvasElement> = new Map();

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
    char.style.top = '0';
    screenContainer.appendChild(char);

    const oldCharWidth = charWidth;
    const oldCharHeight = charHeight;
    charWidth = Math.max(char.offsetWidth + scaledLetterSpacing(), 1);
    charHeight = char.offsetHeight;
    if (oldCharWidth !== charWidth || oldCharHeight !== charHeight) {
      cursorEl.style.width = `${charWidth}px`;
      cursorEl.style.height = `${charHeight}px`;
      cursorCanvasEl.width = charWidth;
      cursorCanvasEl.height = charHeight;

      charsCache.clear();
    }
    screenContainer.removeChild(char);
  };

  const font = (p: CalculatedProps, isEmojiFont?: boolean) =>
    [
      p.hiItalic ? 'italic' : '',
      p.hiBold ? 'bold' : '',
      `${scaledFontSize()}px`,
      isEmojiFont ? 'Apple Color Emoji' : fontFamily,
    ].join(' ');

  const getCharBitmap = (char: string, hlId: number) => {
    // eslint-disable-next-line
    const p = highlightTable[hlId].calculated!;
    const key = `${char}:${p.bgColor}:${p.fgColor}:${
      p.hiUndercurl || p.hiUnderline ? p.spColor : '-'
    }:${p.hiItalic}:${p.hiBold}:${p.hiUndercurl}:${p.hiStrikethrough}`;
    if (!charsCache.has(key)) {
      // TODO: worker maybe?
      // const charCanvas = new OffscreenCanvas(charWidth * 3, charHeight);
      const charCanvas = document.createElement('canvas');
      charCanvas.width = charWidth * 3;
      charCanvas.height = charHeight;

      // eslint-disable-next-line
      const charCtx = charCanvas.getContext('2d', {
        alpha: true,
      }) as CanvasRenderingContext2D;

      if (p.hiUndercurl) {
        charCtx.strokeStyle = p.spColor as string;
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

      charCtx.fillStyle = p.fgColor;
      charCtx.font = font(p, isEmoji(char));
      charCtx.textAlign = 'left';
      charCtx.textBaseline = 'middle';
      if (char) {
        charCtx.fillText(
          char,
          Math.round(scaledLetterSpacing() / 2) + charWidth,
          Math.round(charHeight / 2),
        );
      }

      if (p.hiUnderline) {
        charCtx.strokeStyle = p.fgColor;
        charCtx.lineWidth = scale;
        charCtx.beginPath();
        charCtx.moveTo(charWidth, charHeight - scale);
        charCtx.lineTo(charWidth * 2, charHeight - scale);
        charCtx.stroke();
      }

      if (p.hiStrikethrough) {
        charCtx.strokeStyle = p.fgColor;
        charCtx.lineWidth = scale;
        charCtx.beginPath();
        charCtx.moveTo(charWidth, charHeight * 0.5);
        charCtx.lineTo(charWidth * 2, charHeight * 0.5);
        charCtx.stroke();
      }
      charsCache.set(key, charCanvas);
    }
    // eslint-disable-next-line
    return charsCache.get(key)!;
  };

  const initChar = (i: number, j: number) => {
    if (!chars[i]) chars[i] = [];
    if (!chars[i][j]) chars[i][j] = {};
  };

  const printBackground = (hlId: number, i: number, j: number, length: number) => {
    const fillStyle = highlightTable[hlId]?.calculated?.bgColor;
    if (fillStyle) {
      context.fillStyle = fillStyle;
      // Add an extra BG if this is the edge of the screen to make it look nicer
      const isEndOfLine = j + length === cols;
      const bgWidth = isEndOfLine ? (length + 1) * charWidth : length * charWidth;
      context.fillRect(j * charWidth, i * charHeight, bgWidth, charHeight);
    }
  };

  const printChar = (i: number, j: number, char: string, hlId: number) => {
    initChar(i, j);
    chars[i][j].char = char;
    chars[i][j].hlId = hlId;
    chars[i][j].bitmap = getCharBitmap(char, hlId);

    context.drawImage(
      chars[i][j].bitmap as HTMLCanvasElement,
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

  // https://github.com/neovim/neovim/blob/5a11e55/runtime/doc/ui.txt#L237
  const redrawDefaultColors = () => {
    context.fillStyle = highlightTable[0]?.calculated?.bgColor || DEFAULT_BG_COLOR;
    context.fillRect(0, 0, canvasEl.width, canvasEl.height);
    for (let i = 0; i <= rows; i += 1) {
      if (chars[i]) {
        for (let j = 0; j <= cols; j += 1) {
          const redrawChar = chars[i][j];
          if (redrawChar) {
            const { hlId } = redrawChar;
            if (hlId !== undefined && hlId > 0) {
              const { foreground, background, special } = highlightTable[hlId].value || {};
              if (!foreground || !background || !special) {
                printBackground(hlId, i, j, 1);
              }
            }
          }
        }
      }
    }
    for (let i = 0; i <= rows; i += 1) {
      if (chars[i]) {
        for (let j = 0; j <= cols; j += 1) {
          const redrawChar = chars[i][j];
          if (redrawChar) {
            const { hlId, char } = redrawChar;
            if (hlId !== undefined && typeof char === 'string' && char !== ' ') {
              const { foreground, background, special } = highlightTable[hlId].value || {};
              if (!foreground || !background || !special) {
                chars[i][j].bitmap = undefined;
                printChar(i, j, char, hlId);
              }
            }
          }
        }
      }
    }
  };

  const redrawCursor = () => {
    const m = modeInfoSet && modeInfoSet[mode];

    // TODO: check if cursor changed (char, hlId, etc)
    if (!m) return;

    const hlId = m.attr_id === 0 ? -1 : m.attr_id;

    const { width, height } = cursorCanvasEl;
    const fillStyle = highlightTable[hlId]?.calculated?.bgColor;
    if (fillStyle) {
      cursorContext.fillStyle = fillStyle;
    }

    if (m.cursor_shape === 'block') {
      cursorChar = chars?.[cursorPosition[0]]?.[cursorPosition[1]]?.char || ' ';
      cursorContext.fillRect(0, 0, charWidth, charHeight);
      const cursorBitmap = getCharBitmap(cursorChar, hlId);
      cursorContext.drawImage(cursorBitmap, -charWidth, 0);
    } else if (m.cursor_shape === 'vertical') {
      const curWidth = m.cell_percentage
        ? Math.max(scale, Math.round((charWidth / 100) * m.cell_percentage))
        : scale;
      cursorContext.clearRect(0, 0, width, height);
      cursorContext.fillRect(0, 0, curWidth, charHeight);
    } else if (m.cursor_shape === 'horizontal') {
      const curHeight = m.cell_percentage
        ? Math.max(scale, Math.round((charHeight / 100) * m.cell_percentage))
        : scale;

      // TODO: test
      cursorContext.clearRect(0, 0, width, height);
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
          iterations: Infinity,
          delay: m.blinkwait || 0,
        },
      );
    }
  };

  const repositionCursor = (newCursor: [number, number]): void => {
    if (newCursor) cursorPosition = newCursor;
    const left = cursorPosition[1] * charWidth;
    const top = cursorPosition[0] * charHeight;
    cursorEl.style.transform = `translate(${left}px, ${top}px)`;
  };

  const optionSet = {
    guifont: (newFont: string) => {
      const [newFontFamily, newFontSize] = newFont.trim().split(':h');
      if (newFontFamily && newFontFamily !== '') {
        nvim.command(`VVset fontfamily=${newFontFamily.replace(/_/g, '\\ ')}`);
        if (newFontSize && newFontFamily !== '') {
          nvim.command(`VVset fontsize=${newFontSize}`);
        }
      }
    },
  };

  const recalculateHighlightTable = () => {
    (Object.keys(highlightTable) as unknown as number[]).forEach((id) => {
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
          strikethrough,
        } = highlightTable[id].value || {};
        const r = reverse || standout;
        const fg = getColor(foreground, highlightTable[0]?.calculated?.fgColor) as string;
        const bg = getColor(background, highlightTable[0]?.calculated?.bgColor) as string;
        const sp = getColor(special, highlightTable[0]?.calculated?.spColor) as string;

        highlightTable[id as unknown as number].calculated = {
          fgColor: r ? bg : fg,
          bgColor: r ? fg : bg,
          spColor: sp,
          hiItalic: showItalic && !!italic,
          hiBold: showBold && !!bold,
          hiUnderline: showUnderline && !!underline,
          hiUndercurl: showUndercurl && !!undercurl,
          hiStrikethrough: showStrikethrough && !!strikethrough,
        };
      }
    });
  };

  /**
   * If char previous to the current cell is wider that char width, we need to draw that part
   * of it that overlaps the current cell when we redraw it.
   */
  const overlapPrev = (i: number, j: number) => {
    if (chars[i] && chars[i][j - 1] && chars[i][j - 1].bitmap) {
      context.drawImage(
        chars[i][j - 1].bitmap as HTMLCanvasElement,
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

  /**
   * If char next to the cell is wider that char width, we need to draw that part
   * of it that overlaps the current cell when we redraw it.
   */
  const overlapNext = (i: number, j: number) => {
    if (chars[i] && chars[i][j + 1] && chars[i][j + 1].bitmap) {
      context.drawImage(
        chars[i][j + 1].bitmap as HTMLCanvasElement,
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

  /** Clean char from previous overlapping left and right symbols. */
  const cleanOverlap = (i: number, j: number) => {
    if (chars[i] && chars[i][j]) {
      const { hlId } = chars[i][j];
      if (hlId !== undefined) {
        const fillStyle = highlightTable[hlId]?.calculated?.bgColor;
        if (fillStyle) {
          context.fillStyle = fillStyle;
          context.fillRect(j * charWidth, i * charHeight, charWidth, charHeight);
          context.drawImage(
            chars[i][j].bitmap as HTMLCanvasElement,
            charWidth,
            0,
            charWidth,
            charHeight,
            j * charWidth,
            i * charHeight,
            charWidth,
            charHeight,
          );
          overlapPrev(i, j);
          overlapNext(i, j);
        }
      }
    }
  };

  // https://github.com/neovim/neovim/blob/master/runtime/doc/ui.txt
  const redrawCmd: Partial<UiEventsHandlers> = {
    set_title: () => {
      /* empty */
    },
    set_icon: () => {
      /* empty */
    },

    win_viewport: () => {
      /* empty */
    },

    mode_info_set: (props) => {
      modeInfoSet = props[0][1].reduce((r, modeInfo) => ({ ...r, [modeInfo.name]: modeInfo }), {});
    },

    option_set: (options) => {
      options.forEach(([option, value]) => {
        // @ts-expect-error TODO
        if (optionSet[option]) {
          // @ts-expect-error TODO
          optionSet[option](value);
        } else {
          // console.warn('Unknown option', option, value); // eslint-disable-line no-console
        }
      });
    },

    mode_change: (modes) => {
      mode = modes[modes.length - 1][0];
    },

    mouse_on: () => {
      /* empty */
    },
    mouse_off: () => {
      /* empty */
    },

    busy_start: () => {
      /* empty */
    },
    busy_stop: () => {
      /* empty */
    },

    suspend: () => {
      /* empty */
    },

    update_menu: () => {
      /* empty */
    },

    bell: () => {
      /* empty */
    },
    visual_bell: () => {
      /* empty */
    },

    hl_group_set: () => {
      /* empty */
    },

    flush: () => {
      redrawCursor();
    },

    grid_resize: ([[, newCols, newRows]]) => {
      const oldCols = cols;
      const oldRows = rows;

      cols = newCols;
      rows = newRows;

      // Add extra column on the right to fill it with adjacent color to have a nice right border
      if ((cols + 1) * charWidth > canvasEl.width || rows * charHeight > canvasEl.height) {
        const width = (cols + 1) * charWidth;
        const height = rows * charHeight;

        screenContainer.style.width = `${width}px`;
        screenContainer.style.height = `${height}px`;

        canvasEl.width = (cols + 1) * charWidth;
        canvasEl.height = rows * charHeight;
        context.fillStyle = highlightTable[0]?.calculated?.bgColor || DEFAULT_BG_COLOR;
        context.fillRect(0, 0, canvasEl.width, canvasEl.height);
      }

      // If we are not resizing the window, then we triggered resize from vim using `:set columns` or `:set lines`.
      // We need to send message to the main to resize the window.
      if (!isResizing) {
        if (oldCols !== cols) {
          const width = Math.ceil((cols * charWidth) / scale);
          transport.send('set-screen-width', width);
        }
        if (oldRows !== rows) {
          const height = Math.ceil((rows * charHeight) / scale);
          transport.send('set-screen-height', height);
        }
      }
    },

    default_colors_set: (props) => {
      const [foreground, background, special] = props[props.length - 1];

      const calculated = {
        bgColor: getColor(background, DEFAULT_BG_COLOR) as string,
        fgColor: getColor(foreground, DEFAULT_FG_COLOR) as string,
        spColor: getColor(special, DEFAULT_SP_COLOR),
        hiItalic: false,
        hiBold: false,
        hiUnderline: false,
        hiUndercurl: false,
        hiStrikethrough: false,
      };
      if (!highlightTable[0] || !isEqual(highlightTable[0].calculated, calculated)) {
        highlightTable[0] = { calculated };
        highlightTable[-1] = {
          calculated: {
            ...calculated,
            bgColor: getColor(foreground, DEFAULT_FG_COLOR) as string,
            fgColor: getColor(background, DEFAULT_BG_COLOR) as string,
          },
        };
        recalculateHighlightTable();
        if (highlightTable[0]?.calculated?.bgColor) {
          document.body.style.background = highlightTable[0].calculated.bgColor;
          transport.send('set-background-color', highlightTable[0].calculated.bgColor);
        }
        redrawDefaultColors();
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
      // eslint-disable-next-line
      for (const [, row, col, cells] of props) {
        let lineLength = 0;
        let currentHlId = 0;

        // eslint-disable-next-line
        for (const [_char, hlId, length = 1] of cells) {
          if (hlId !== undefined) {
            currentHlId = hlId;
          }

          if (length > 0) {
            printBackground(currentHlId, row, col + lineLength, length);

            lineLength += length;
          }
        }

        currentHlId = 0;
        lineLength = 0;
        // eslint-disable-next-line
        for (const [char, hlId, length = 1] of cells) {
          if (hlId !== undefined) {
            currentHlId = hlId;
          }
          for (let j = 0; j < length; j += 1) {
            printChar(row, col + lineLength + j, char, currentHlId);
          }
          lineLength += length;
        }
        cleanOverlap(row, col - 1);
        cleanOverlap(row, col + lineLength);
        overlapPrev(row, col);
        overlapNext(row, col + lineLength - 1);
      }
    },

    grid_clear: () => {
      cursorPosition = [0, 0];
      context.fillStyle = highlightTable[0]?.calculated?.bgColor || DEFAULT_BG_COLOR;
      context.fillRect(0, 0, canvasEl.width, canvasEl.height);
      chars = [];
    },

    grid_destroy: () => {
      /* empty */
    },

    grid_cursor_goto: ([[_, ...newCursor]]) => {
      repositionCursor(newCursor);

      // Temporary workaround to fix cursor position in terminal mode. Nvim API does not send the very last cursor
      // position in terminal on redraw, but when you send any command to nvim, it redraws it correctly. Need to
      // investigate it and find a better permanent fix. Maybe this is a bug in nvim and then
      // TODO: file a ticket to nvim.
      nvim.getMode();
    },

    grid_scroll: ([[_grid, top, bottom, left, right, scrollCount]]) => {
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

      for (
        let i = scrollCount > 0 ? top : bottom - 1;
        scrollCount > 0 ? i <= bottom - scrollCount - 1 : i >= top - scrollCount;
        i += scrollCount > 0 ? 1 : -1
      ) {
        for (let j = left; j <= right - 1; j += 1) {
          const sourceI = i + scrollCount;

          initChar(i, j);
          initChar(sourceI, j);

          // Swap char to scroll to destination
          [chars[i][j], chars[sourceI][j]] = [chars[sourceI][j], chars[i][j]];
        }
      }

      for (let i = top; i <= bottom; i += 1) {
        cleanOverlap(i, left - 1);
        cleanOverlap(i, right);
      }
    },
  };

  const handleSet = {
    fontfamily: (newFontFamily: string) => {
      fontFamily = `${newFontFamily}, ${DEFAULT_FONT_FAMILY}`;
    },

    fontsize: (newFontSize: string) => {
      fontSize = parseInt(newFontSize, 10);
    },

    letterspacing: (newLetterSpacing: string) => {
      letterSpacing = parseInt(newLetterSpacing, 10);
    },

    lineheight: (newLineHeight: string) => {
      lineHeight = parseFloat(newLineHeight);
    },

    bold: (value: boolean) => {
      showBold = value;
    },

    italic: (value: boolean) => {
      showItalic = value;
    },

    underline: (value: boolean) => {
      showUnderline = value;
    },

    undercurl: (value: boolean) => {
      showUndercurl = value;
    },

    strikethrough: (value: boolean) => {
      showStrikethrough = value;
    },
  };

  const redraw = (args: UiEventsArgs) => {
    try {
      args.forEach(([cmd, ...props]) => {
        const command = redrawCmd[cmd];
        if (command) {
          // console.log('hey', cmd, props);
          // @ts-expect-error TODO: find the way to type it without errors
          command(props);
        } else {
          console.warn('Unknown redraw command', cmd, props); // eslint-disable-line no-console
        }
      });
    } catch (e) {
      // eslint-disable-next-line
      console.error(e);
    }
  };

  const setScale = () => {
    scale = isRetina() ? RETINA_SCALE : 1;
    screenContainer.style.transform = `scale(${1 / scale})`;
    screenContainer.style.width = `${scale * 100}%`;
    screenContainer.style.height = `${scale * 100}%`;

    // Detect when you drag between retina/non-retina displays
    window.matchMedia('screen and (min-resolution: 2dppx)').addListener(() => {
      setScale();
      measureCharSize();
      setResizing();
      nvim.uiTryResize(cols, rows);
    });
  };

  /**
   * Return grid [col, row] coordinates by pixel coordinates.
   */
  const screenCoords = (width: number, height: number): [number, number] => {
    return [Math.floor((width * scale) / charWidth), Math.floor((height * scale) / charHeight)];
  };

  const resize = (forceRedraw = false) => {
    const [newCols, newRows] = screenCoords(window.innerWidth, window.innerHeight);
    if (newCols !== cols || newRows !== rows || forceRedraw) {
      cols = newCols;
      rows = newRows;
      setResizing();
      nvim.uiTryResize(cols, rows);
    }
  };

  const uiAttach = () => {
    [cols, rows] = screenCoords(window.innerWidth, window.innerHeight);
    nvim.uiAttach(cols, rows, { ext_linegrid: true });
    window.addEventListener('resize', () => resize());
  };

  const updateSettings = (newSettings: Settings, isInitial = false) => {
    let requireRedraw = isInitial;
    let requireRecalculateHighlight = false;
    const requireRedrawProps = [
      'fontfamily',
      'fontsize',
      'letterspacing',
      'lineheight',
      'bold',
      'italic',
      'underline',
      'undercurl',
      'strikethrough',
    ];

    const requireRecalculateHighlightProps = [
      'bold',
      'italic',
      'underline',
      'undercurl',
      'strikethrough',
    ];

    Object.keys(newSettings).forEach((key) => {
      // @ts-expect-error TODO
      if (handleSet[key]) {
        requireRedraw = requireRedraw || requireRedrawProps.includes(key);
        requireRecalculateHighlight =
          requireRecalculateHighlight || requireRecalculateHighlightProps.includes(key);
        // @ts-expect-error TODO
        handleSet[key](newSettings[key]);
      }
    });

    if (requireRecalculateHighlight && !isInitial) {
      recalculateHighlightTable();
    }

    if (requireRedraw) {
      measureCharSize();
      charsCache.clear();
      if (!isInitial) {
        resize(true);
      }
    }
  };

  initScreen();
  initCursor();
  setScale();

  nvim.on('redraw', redraw);

  transport.on('updateSettings', (s) => updateSettings(s));
  updateSettings(settings, true);

  transport.on('force-resize', () => {
    resize();
  });

  uiAttach();

  return {
    screenCoords,
    getCursorElement,
  };
};

export default screen;
