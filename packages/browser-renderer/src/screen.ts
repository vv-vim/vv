// TODO: Refactor, Fix types.
import debounce from 'lodash/debounce';
import throttle from 'lodash/throttle';
import isFinite from 'lodash/isFinite';
import isEqual from 'lodash/isEqual';

import getColor from '@renderer/lib/getColor';
import { Settings } from '@renderer/types';

import * as PIXI from '@renderer/lib/pixi';

import { Transport } from '@renderer/transport/types';

import nvim from '@renderer/nvim';

export type Screen = {
  screenCoords: (width: number, height: number) => [number, number];
  getCursorElement: () => HTMLDivElement;
};

const screen = ({
  settings,
  transport: newTransport,
}: {
  settings: Settings;
  transport: Transport;
}): Screen => {
  let transport: Transport;

  let screenContainer: HTMLDivElement;
  let cursorEl: HTMLDivElement;
  let screenEl: HTMLDivElement;

  let cursorPosition: [number, number] = [0, 0];
  let cursorChar: string;

  let startCursorBlinkOnTimeout: NodeJS.Timeout | null;
  let startCursorBlinkOffTimeout: number | null;
  let blinkOnCursorBlinkInterval: NodeJS.Timeout | null;
  let blinkOffCursorBlinkInterval: NodeJS.Timeout | null;

  let scale: number;
  let charWidth: number;
  let charHeight: number;

  let fontFamily = 'monospace';
  let fontSize = 12;
  let lineHeight = 1.25;
  let letterSpacing = 0;

  const defaultFgColor = 'rgb(255,255,255)';
  const defaultBgColor = 'rgb(0,0,0)';
  const defaultSpColor = 'rgb(255,255,255)';

  let cols: number;
  let rows: number;

  // TODO
  let modeInfoSet: any;
  let mode: string;

  let showBold = true;
  let showItalic = true;
  let showUnderline = true;
  let showUndercurl = true;
  let showStrikethrough = true;

  const charCanvas = new OffscreenCanvas(1, 1);
  const charCtx = charCanvas.getContext('2d', { alpha: true }) as OffscreenCanvasRenderingContext2D;

  type Char = {
    sprite: PIXI.Sprite;
    bg: PIXI.Graphics;
    char?: string | null;
    hlId?: number;
  };

  const chars: Char[][] = [];

  type CalculatedProps = {
    bgNum?: number;
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
    // TODO types
    value?: any;
  };

  type HighlightTable = Record<number, HighlightProps>;

  const highlightTable: HighlightTable = {
    '0': {
      calculated: {
        bgNum: 0x000000,
        bgColor: defaultBgColor,
        fgColor: defaultFgColor,
        spColor: defaultSpColor,
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
        bgNum: 0xffffff,
        bgColor: defaultFgColor,
        fgColor: defaultBgColor,
        spColor: defaultSpColor,
        hiItalic: false,
        hiBold: false,
        hiUnderline: false,
        hiUndercurl: false,
        hiStrikethrough: false,
      },
    },
  };

  // WebGL
  let stage: PIXI.Container;
  let renderer: PIXI.Renderer;
  let charsContainer: PIXI.Container;
  let bgContainer: PIXI.Container;
  let cursorContainer: PIXI.Container;
  let cursorSprite: PIXI.Sprite;
  let cursorBg: PIXI.Graphics;

  let needRerender = false;
  const TARGET_FPS = 60;

  const getCursorElement = (): HTMLDivElement => cursorEl;

  const windowPixelSize = () => ({
    width: window.screen.width * window.devicePixelRatio,
    height: window.screen.height * window.devicePixelRatio,
  });

  const initCursor = () => {
    cursorEl = document.createElement('div');
    cursorEl.style.position = 'absolute';
    cursorEl.style.zIndex = '100';
    cursorEl.style.top = '0';
    cursorEl.style.left = '0';
    screenEl.appendChild(cursorEl);
  };

  const initScreen = () => {
    screenContainer = document.createElement('div');
    document.body.appendChild(screenContainer);

    screenContainer.style.position = 'absolute';
    screenContainer.style.left = '0';
    screenContainer.style.top = '0';
    screenContainer.style.transformOrigin = '0 0';

    screenEl = document.createElement('div');

    // @ts-ignore incomplete type declaration for style?
    screenEl.style.contain = 'strict';
    screenEl.style.overflow = 'hidden';

    // Init WebGL for text
    const pixi = new PIXI.Application({
      transparent: true,
      autoStart: false,
      ...windowPixelSize(),
    });

    screenEl.appendChild(pixi.view);

    screenContainer.appendChild(screenEl);

    ({ stage, renderer } = pixi);
    pixi.ticker.stop();
    stage.interactiveChildren = false;

    charsContainer = new PIXI.Container();
    bgContainer = new PIXI.Container();
    cursorContainer = new PIXI.Container();
    cursorSprite = new PIXI.Sprite();
    cursorBg = new PIXI.Graphics();

    stage.addChild(bgContainer);
    stage.addChild(charsContainer);
    stage.addChild(cursorContainer);
    cursorContainer.addChild(cursorBg);
    cursorContainer.addChild(cursorSprite);

    // Init screen for background
    screenEl.style.width = `${windowPixelSize().width}px`;
    screenEl.style.height = `${windowPixelSize().width}px`;
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
    char.style.top = '0';
    screenEl.appendChild(char);

    const oldCharWidth = charWidth;
    const oldCharHeight = charHeight;
    charWidth = Math.max(char.offsetWidth + scaledLetterSpacing(), 1);
    charHeight = char.offsetHeight;
    if (oldCharWidth !== charWidth || oldCharHeight !== charHeight) {
      cursorSprite.x = -charWidth;
      cursorEl.style.width = `${charWidth}px`;
      cursorEl.style.height = `${charHeight}px`;

      if (charCanvas) {
        charCanvas.width = charWidth * 3;
        charCanvas.height = charHeight;
      }

      PIXI.utils.clearTextureCache();
    }
    screenEl.removeChild(char);
  };

  const font = (p: CalculatedProps) =>
    [p.hiItalic ? 'italic' : '', p.hiBold ? 'bold' : '', `${scaledFontSize()}px`, fontFamily].join(
      ' ',
    );

  const getCharBitmap = (char: string, props: CalculatedProps) => {
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
      charCtx.strokeStyle = props.spColor as string;
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

    if (props.hiStrikethrough) {
      charCtx.strokeStyle = props.fgColor;
      charCtx.lineWidth = scale;
      charCtx.beginPath();
      charCtx.moveTo(charWidth, charHeight * 0.5);
      charCtx.lineTo(charWidth * 2, charHeight * 0.5);
      charCtx.stroke();
    }

    return charCanvas.transferToImageBitmap();
  };

  const getCharTexture = (char: string, hlId: number) => {
    const key = `${char}:${hlId}`;
    if (!PIXI.utils.TextureCache[key]) {
      const props = highlightTable[hlId].calculated;
      // @ts-ignore getCharBitmap returns ImageBitmap that can be used as texture
      PIXI.Texture.addToCache(PIXI.Texture.from(getCharBitmap(char, props)), key);
    }
    return PIXI.Texture.from(key);
  };

  const initChar = (i: number, j: number) => {
    if (!chars[i]) chars[i] = [];
    if (!chars[i][j]) {
      chars[i][j] = {
        sprite: new PIXI.Sprite(),
        bg: new PIXI.Graphics(),
      };
      charsContainer.addChild(chars[i][j].sprite);
      bgContainer.addChild(chars[i][j].bg);
    }
  };

  const printChar = (i: number, j: number, char: string, hlId: number) => {
    initChar(i, j);

    // Print char
    chars[i][j].char = char;
    chars[i][j].hlId = hlId;
    chars[i][j].sprite.texture = getCharTexture(char, hlId);
    chars[i][j].sprite.position.set((j - 1) * charWidth, i * charHeight);
    chars[i][j].sprite.visible = true;

    // Draw bg
    chars[i][j].bg.position.set(j * charWidth, i * charHeight);
    if (hlId !== 0 && highlightTable[hlId]?.calculated?.bgNum) {
      chars[i][j].bg.clear();
      chars[i][j].bg.beginFill(highlightTable[hlId]?.calculated?.bgNum);
      if (j === cols - 1) {
        chars[i][j].bg.drawRect(0, 0, charWidth * 2, charHeight);
      } else {
        chars[i][j].bg.drawRect(0, 0, charWidth, charHeight);
      }
      chars[i][j].bg.visible = true;
    } else {
      chars[i][j].bg.visible = false;
    }
  };

  const cursorBlinkOn = () => {
    cursorContainer.visible = true;
    renderer.render(stage);
  };

  const cursorBlinkOff = () => {
    cursorContainer.visible = false;
    renderer.render(stage);
  };

  const cursorBlink = ({
    blinkon,
    blinkoff,
    blinkwait,
  }: { blinkon?: number; blinkoff?: number; blinkwait?: number } = {}) => {
    cursorContainer.visible = true;

    if (startCursorBlinkOnTimeout) clearTimeout(startCursorBlinkOnTimeout);
    if (startCursorBlinkOffTimeout) clearTimeout(startCursorBlinkOffTimeout);
    if (blinkOnCursorBlinkInterval) clearInterval(blinkOnCursorBlinkInterval);
    if (blinkOffCursorBlinkInterval) clearInterval(blinkOffCursorBlinkInterval);

    startCursorBlinkOnTimeout = null;
    startCursorBlinkOffTimeout = null;
    blinkOnCursorBlinkInterval = null;
    blinkOffCursorBlinkInterval = null;

    if (blinkoff && blinkon) {
      startCursorBlinkOffTimeout = setTimeout(() => {
        cursorBlinkOff();
        blinkOffCursorBlinkInterval = setInterval(cursorBlinkOff, blinkoff + blinkon);

        startCursorBlinkOnTimeout = setTimeout(() => {
          cursorBlinkOn();
          blinkOnCursorBlinkInterval = setInterval(cursorBlinkOn, blinkoff + blinkon);
        }, blinkoff);
      }, blinkwait);
    }
  };

  const clearCursor = () => {
    cursorBg.clear();
    cursorSprite.visible = false;
  };

  const redrawCursor = () => {
    const m = modeInfoSet && modeInfoSet[mode];
    cursorBlink(m);

    if (!m) return;
    // TODO: check if cursor changed (char, hlId, etc)
    clearCursor();

    const hlId = m.attr_id === 0 ? -1 : m.attr_id;
    cursorBg.beginFill(highlightTable[hlId]?.calculated?.bgNum);

    if (m.cursor_shape === 'block') {
      cursorChar = chars[cursorPosition[0]][cursorPosition[1]].char || ' ';
      cursorSprite.texture = getCharTexture(cursorChar, hlId);
      cursorBg.drawRect(0, 0, charWidth, charHeight);
      cursorSprite.visible = true;
    } else if (m.cursor_shape === 'vertical') {
      const curWidth = m.cell_percentage
        ? Math.max(scale, Math.round((charWidth / 100) * m.cell_percentage))
        : scale;
      cursorBg.drawRect(0, 0, curWidth, charHeight);
    } else if (m.cursor_shape === 'horizontal') {
      const curHeight = m.cell_percentage
        ? Math.max(scale, Math.round((charHeight / 100) * m.cell_percentage))
        : scale;
      cursorBg.drawRect(0, charHeight - curHeight, charWidth, curHeight);
    }
    needRerender = true;
  };

  const repositionCursor = (newCursor: [number, number]): void => {
    if (newCursor) cursorPosition = newCursor;
    const left = cursorPosition[1] * charWidth;
    const top = cursorPosition[0] * charHeight;
    cursorContainer.position.set(left, top);
    cursorEl.style.transform = `translate(${left}px, ${top}px)`;
    redrawCursor();
  };

  const optionSet = {
    guifont: (newFont: string) => {
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
    if (highlightTable[0]?.calculated?.bgColor) {
      document.body.style.background = highlightTable[0].calculated.bgColor;
      transport.send('set-background-color', highlightTable[0].calculated.bgColor);
    }

    PIXI.utils.clearTextureCache();
    for (let i = 0; i <= rows; i += 1) {
      for (let j = 0; j <= cols; j += 1) {
        initChar(i, j);
        const { char, hlId } = chars[i][j];
        if (char && isFinite(hlId)) {
          printChar(i, j, char, hlId as number);
        }
      }
    }
    needRerender = true;
  }, 10);

  const recalculateHighlightTable = () => {
    Object.keys(highlightTable).forEach((id) => {
      if (((id as unknown) as number) > 0) {
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
        } = highlightTable[(id as unknown) as number].value;
        const r = reverse || standout;
        const fg = getColor(foreground, highlightTable[0]?.calculated?.fgColor) as string;
        const bg = getColor(background, highlightTable[0]?.calculated?.bgColor) as string;
        const sp = getColor(special, highlightTable[0]?.calculated?.spColor) as string;

        highlightTable[(id as unknown) as number].calculated = {
          fgColor: r ? bg : fg,
          bgColor: r ? fg : bg,
          spColor: sp,
          bgNum: r ? foreground : background,
          hiItalic: showItalic && italic,
          hiBold: showBold && bold,
          hiUnderline: showUnderline && underline,
          hiUndercurl: showUndercurl && undercurl,
          hiStrikethrough: showStrikethrough && strikethrough,
        };
      }
    });
    reprintAllChars();
  };

  // https://github.com/neovim/neovim/blob/master/runtime/doc/ui.txt
  const redrawCmd = {
    set_title: () => {
      /* empty */
    },
    set_icon: () => {
      /* empty */
    },

    mode_info_set: (props: any) => {
      modeInfoSet = props[0][1].reduce((r: any, o: any) => ({ ...r, [o.name]: o }), {});
      redrawCursor();
    },

    option_set: (options: Array<[string, string]>) => {
      options.forEach(([option, value]) => {
        // @ts-ignore TODO
        if (optionSet[option]) {
          // @ts-ignore TODO
          optionSet[option](value);
        } else {
          // console.warn('Unknown option', option, value); // eslint-disable-line no-console
        }
      });
    },

    mode_change: (modes: any) => {
      [mode] = modes[modes.length - 1];
      redrawCursor();
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

    flush: throttle(() => {
      if (needRerender) {
        needRerender = false;
        renderer.render(stage);
      }
    }, 1000 / TARGET_FPS),

    // New api
    grid_resize: (props: number[][]) => {
      /* eslint-disable prefer-destructuring */
      cols = props[0][1];
      rows = props[0][2];
      /* eslint-enable prefer-destructuring */

      if (cols * charWidth > renderer.width || rows * charHeight > renderer.height) {
        // Add extra column on the right to fill it with adjacent color to have a nice right border
        const width = (cols + 1) * charWidth;
        const height = rows * charHeight;

        screenEl.style.width = `${width}px`;
        screenEl.style.height = `${height}px`;

        renderer.resize(width, height);
        needRerender = true;
      }
    },

    default_colors_set: (props: any) => {
      const [foreground, background, special] = props[props.length - 1];

      const calculated = {
        bgColor: getColor(background, defaultBgColor) as string,
        fgColor: getColor(foreground, defaultFgColor) as string,
        spColor: getColor(special, defaultSpColor),
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
            bgNum: foreground,
            bgColor: getColor(foreground, defaultFgColor) as string,
            fgColor: getColor(background, defaultBgColor) as string,
          },
        };
        recalculateHighlightTable();
      }
    },

    hl_attr_define: (props: Array<[number, any]>) => {
      props.forEach(([id, value]) => {
        highlightTable[id] = {
          value,
        };
      });
      recalculateHighlightTable();
    },

    // TODO types
    grid_line: (props: any) => {
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
            printChar(row, col + lineLength + j, char, currentHlId);
          }
          lineLength += length;
        }
      }
      needRerender = true;
      if (
        chars[cursorPosition[0]] &&
        chars[cursorPosition[0]][cursorPosition[1]] &&
        cursorChar !== chars[cursorPosition[0]][cursorPosition[1]].char
      ) {
        redrawCursor();
      }
    },

    grid_clear: () => {
      cursorPosition = [0, 0];
      charsContainer.children.forEach((c) => {
        c.visible = false; // eslint-disable-line no-param-reassign
      });
      bgContainer.children.forEach((c) => {
        c.visible = false; // eslint-disable-line no-param-reassign
      });
      for (let i = 0; i <= rows; i += 1) {
        if (!chars[i]) chars[i] = [];
        for (let j = 0; j <= cols; j += 1) {
          initChar(i, j);
          chars[i][j].char = null;
        }
      }
      needRerender = true;
    },

    grid_destroy: () => {
      /* empty */
    },

    grid_cursor_goto: ([[_, ...newCursor]]: Array<[string, number, number]>) => {
      repositionCursor(newCursor);
    },

    grid_scroll: ([[_grid, top, bottom, left, right, scrollCount]]: Array<
      [string, number, number, number, number, number]
    >) => {
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

          // Update scrolled char sprite position
          if (chars[i][j].sprite) {
            chars[i][j].sprite.y = i * charHeight;
            chars[i][j].bg.y = i * charHeight;
          }

          // Clear and reposition old char
          if (chars[sourceI][j].sprite) {
            chars[sourceI][j].sprite.visible = false;
            chars[sourceI][j].bg.visible = false;
            chars[sourceI][j].sprite.y = sourceI * charHeight;
            chars[sourceI][j].bg.y = sourceI * charHeight;
          }
        }
      }
      needRerender = true;
    },

    win_viewport: () => {
      // Why nvim sending it without ext_multigrid enabled?
    },
  };

  const handleSet = {
    fontfamily: (newFontFamily: string) => {
      fontFamily = newFontFamily;
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

  const redraw = (args: any[]) => {
    for (let i = 0; i < args.length; i += 1) {
      const [cmd, ...props] = args[i];
      // @ts-ignore TODO
      if (redrawCmd[cmd]) {
        // @ts-ignore TODO
        redrawCmd[cmd](props);
      } else {
        console.warn('Unknown redraw command', cmd, props); // eslint-disable-line no-console
      }
    }
  };

  const setScale = () => {
    scale = isRetina() ? RETINA_SCALE : 1;
    screenContainer.style.transform = `scale(${1 / scale})`;
    screenContainer.style.width = `${scale * 100}%`;
    screenContainer.style.height = `${scale * 100}%`;

    // Detect when you drag between retina/non-retina displays
    window.matchMedia('screen and (min-resolution: 2dppx)').addListener(async () => {
      setScale();
      measureCharSize();
      await nvim.uiTryResize(cols, rows);
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
      nvim.uiTryResize(cols, rows);
    }
  };

  const uiAttach = () => {
    [cols, rows] = screenCoords(window.innerWidth, window.innerHeight);
    nvim.uiAttach(cols, rows, { ext_linegrid: true });
    window.addEventListener(
      'resize',
      throttle(() => resize(), 1000 / TARGET_FPS),
    );
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
      // @ts-ignore TODO
      if (handleSet[key]) {
        requireRedraw = requireRedraw || requireRedrawProps.includes(key);
        requireRecalculateHighlight =
          requireRecalculateHighlight || requireRecalculateHighlightProps.includes(key);
        // @ts-ignore TODO
        handleSet[key](newSettings[key]);
      }
    });

    if (requireRecalculateHighlight && !isInitial) {
      recalculateHighlightTable();
    }

    if (requireRedraw) {
      measureCharSize();
      PIXI.utils.clearTextureCache();
      if (!isInitial) {
        resize(true);
      }
    }
  };

  initScreen();
  initCursor();
  setScale();

  transport = newTransport;

  nvim.on('redraw', redraw);

  transport.on('updateSettings', (s) => updateSettings(s));
  updateSettings(settings, true);

  uiAttach();

  return {
    screenCoords,
    getCursorElement,
  };
};

export default screen;
