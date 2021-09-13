// TODO: Refactor
import { throttle, isFinite, isEqual } from 'lodash';

import { getColor, getColorNum } from 'src/lib/getColor';

import * as PIXI from 'src/lib/pixi';

import type { Settings } from 'src/types';
import type {
  Nvim,
  Transport,
  UiEventsHandlers,
  UiEventsArgs,
  ModeInfo,
  HighlightAttrs,
} from '@vvim/nvim';

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
  sprite: PIXI.Sprite;
  bg: PIXI.Sprite;
  char?: string | null;
  hlId?: number;
};

const DEFAULT_FONT_FAMILY = 'monospace';

export class Screen {
  private nvim: Nvim;
  private transport: Transport;

  private screenContainer!: HTMLDivElement;
  private cursorEl!: HTMLDivElement;
  private screenEl!: HTMLDivElement;

  private cursorPosition: [number, number] = [0, 0];
  private cursorChar?: string;

  private startCursorBlinkOnTimeout?: NodeJS.Timeout | null;
  private startCursorBlinkOffTimeout?: NodeJS.Timeout | null;
  private blinkOnCursorBlinkInterval?: NodeJS.Timeout | null;
  private blinkOffCursorBlinkInterval?: NodeJS.Timeout | null;

  private scale!: number;
  private charWidth!: number;
  private charHeight!: number;

  private fontFamily = DEFAULT_FONT_FAMILY;
  private fontSize = 12;
  private lineHeight = 1.25;
  private letterSpacing = 0;

  // TODO upper case
  private defaultFgColor = 'rgb(255,255,255)' as const;
  private defaultBgColor = 'rgb(0,0,0)' as const;
  private defaultSpColor = 'rgb(255,255,255)' as const;

  private cols = 0;
  private rows = 0;

  private modeInfoSet?: Record<string, ModeInfo>;
  private mode?: string;

  private showBold = true;
  private showItalic = true;
  private showUnderline = true;
  private showUndercurl = true;
  private showStrikethrough = true;

  private charCanvas = new OffscreenCanvas(1, 1);
  private charCtx = this.charCanvas.getContext('2d', {
    alpha: true,
  }) as OffscreenCanvasRenderingContext2D;

  private chars: Char[][] = [];

  private highlightTable: HighlightTable = {
    '0': {
      calculated: {
        bgColor: this.defaultBgColor,
        fgColor: this.defaultFgColor,
        spColor: this.defaultSpColor,
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
        bgColor: this.defaultFgColor,
        fgColor: this.defaultBgColor,
        spColor: this.defaultSpColor,
        hiItalic: false,
        hiBold: false,
        hiUnderline: false,
        hiUndercurl: false,
        hiStrikethrough: false,
      },
    },
  };

  // WebGL
  private stage!: PIXI.Container;
  private renderer!: PIXI.Renderer;
  private charsContainer!: PIXI.Container;
  private bgContainer!: PIXI.Container;
  private cursorContainer!: PIXI.Container;
  private cursorSprite!: PIXI.Sprite;
  private cursorBg!: PIXI.Graphics;

  private needRerender = false;

  private TARGET_FPS = 60;

  public getCursorElement = (): HTMLDivElement => this.cursorEl;

  // eslint-disable-next-line class-methods-use-this
  private windowPixelSize() {
    return {
      width: window.screen.width * window.devicePixelRatio,
      height: window.screen.height * window.devicePixelRatio,
    };
  }

  private initCursor() {
    this.cursorEl = document.createElement('div');
    this.cursorEl.style.position = 'absolute';
    this.cursorEl.style.zIndex = '100';
    this.cursorEl.style.top = '0';
    this.cursorEl.style.left = '0';
    this.screenEl.appendChild(this.cursorEl);
  }

  private initScreen() {
    this.screenContainer = document.createElement('div');
    document.body.appendChild(this.screenContainer);

    this.screenContainer.style.position = 'absolute';
    this.screenContainer.style.left = '0';
    this.screenContainer.style.top = '0';
    this.screenContainer.style.transformOrigin = '0 0';

    this.screenEl = document.createElement('div');

    // @ts-expect-error incomplete type declaration for style?
    this.screenEl.style.contain = 'strict';
    this.screenEl.style.overflow = 'hidden';

    // Init WebGL for text
    const pixi = new PIXI.Application({
      transparent: true,
      autoStart: false,
      ...this.windowPixelSize(),
    });

    this.screenEl.appendChild(pixi.view);

    this.screenContainer.appendChild(this.screenEl);

    this.stage = pixi.stage;
    this.renderer = pixi.renderer as PIXI.Renderer;
    pixi.ticker.stop();

    this.charsContainer = new PIXI.Container();
    this.bgContainer = new PIXI.Container();
    this.cursorContainer = new PIXI.Container();
    this.cursorSprite = new PIXI.Sprite();
    this.cursorBg = new PIXI.Graphics();

    this.stage.addChild(this.bgContainer);
    this.stage.addChild(this.charsContainer);
    this.stage.addChild(this.cursorContainer);
    this.cursorContainer.addChild(this.cursorBg);
    this.cursorContainer.addChild(this.cursorSprite);

    // Init screen for background
    this.screenEl.style.width = `${this.windowPixelSize().width}px`;
    this.screenEl.style.height = `${this.windowPixelSize().width}px`;
  }

  private RETINA_SCALE = 2;

  private isRetina() {
    return window.devicePixelRatio === this.RETINA_SCALE;
  }

  private scaledLetterSpacing() {
    if (this.isRetina() || this.letterSpacing === 0) {
      return this.letterSpacing;
    }
    return this.letterSpacing > 0
      ? Math.floor(this.letterSpacing / this.RETINA_SCALE)
      : Math.ceil(this.letterSpacing / this.RETINA_SCALE);
  }

  private scaledFontSize() {
    return this.fontSize * this.scale;
  }

  private measureCharSize() {
    const char = document.createElement('span');
    char.innerHTML = '0';
    char.style.fontFamily = this.fontFamily;
    char.style.fontSize = `${this.scaledFontSize()}px`;
    char.style.lineHeight = `${Math.round(this.scaledFontSize() * this.lineHeight)}px`;
    char.style.position = 'absolute';
    char.style.left = '-1000px';
    char.style.top = '0';
    this.screenEl.appendChild(char);

    const oldCharWidth = this.charWidth;
    const oldCharHeight = this.charHeight;
    this.charWidth = Math.max(char.offsetWidth + this.scaledLetterSpacing(), 1);
    this.charHeight = char.offsetHeight;
    if (oldCharWidth !== this.charWidth || oldCharHeight !== this.charHeight) {
      this.cursorSprite.x = -this.charWidth;
      this.cursorEl.style.width = `${this.charWidth}px`;
      this.cursorEl.style.height = `${this.charHeight}px`;

      if (this.charCanvas) {
        this.charCanvas.width = this.charWidth * 3;
        this.charCanvas.height = this.charHeight;
      }

      PIXI.utils.clearTextureCache();
    }
    this.screenEl.removeChild(char);
  }

  private font(p: CalculatedProps) {
    return [
      p.hiItalic ? 'italic' : '',
      p.hiBold ? 'bold' : '',
      `${this.scaledFontSize()}px`,
      this.fontFamily,
    ].join(' ');
  }

  private getCharBitmap(char: string, props: CalculatedProps) {
    if (props.hiUndercurl) {
      this.charCtx.strokeStyle = props.spColor as string;
      this.charCtx.lineWidth = this.scaledFontSize() * 0.08;
      const x = this.charWidth;
      const y = this.charHeight - (this.scaledFontSize() * 0.08) / 2;
      const h = this.charHeight * 0.2; // Height of the wave
      this.charCtx.beginPath();
      this.charCtx.moveTo(x, y);
      this.charCtx.bezierCurveTo(x + x / 4, y, x + x / 4, y - h / 2, x + x / 2, y - h / 2);
      this.charCtx.bezierCurveTo(x + (x / 4) * 3, y - h / 2, x + (x / 4) * 3, y, x + x, y);
      this.charCtx.stroke();
    }

    this.charCtx.fillStyle = props.fgColor;
    this.charCtx.font = this.font(props);
    this.charCtx.textAlign = 'left';
    this.charCtx.textBaseline = 'middle';
    if (char) {
      this.charCtx.fillText(
        char,
        Math.round(this.scaledLetterSpacing() / 2) + this.charWidth,
        Math.round(this.charHeight / 2),
      );
    }

    if (props.hiUnderline) {
      this.charCtx.strokeStyle = props.fgColor;
      this.charCtx.lineWidth = this.scale;
      this.charCtx.beginPath();
      this.charCtx.moveTo(this.charWidth, this.charHeight - this.scale);
      this.charCtx.lineTo(this.charWidth * 2, this.charHeight - this.scale);
      this.charCtx.stroke();
    }

    if (props.hiStrikethrough) {
      this.charCtx.strokeStyle = props.fgColor;
      this.charCtx.lineWidth = this.scale;
      this.charCtx.beginPath();
      this.charCtx.moveTo(this.charWidth, this.charHeight * 0.5);
      this.charCtx.lineTo(this.charWidth * 2, this.charHeight * 0.5);
      this.charCtx.stroke();
    }

    return this.charCanvas.transferToImageBitmap();
  }

  private getCharTexture(char: string, hlId: number) {
    const key = `${char}:${hlId}`;
    if (!PIXI.utils.TextureCache[key]) {
      const props = this.highlightTable[hlId].calculated;
      // @ts-expect-error getCharBitmap returns ImageBitmap that can be used as texture
      PIXI.Texture.addToCache(PIXI.Texture.from(this.getCharBitmap(char, props)), key);
    }
    return PIXI.Texture.from(key);
  }

  private getBgTexture(bgColor: string, j: number) {
    const isLastCol = j === this.cols - 1;
    const key = `bg:${bgColor}:${isLastCol}`;
    if (!PIXI.utils.TextureCache[key]) {
      this.charCtx.fillStyle = bgColor;
      if (isLastCol) {
        this.charCtx.fillRect(0, 0, this.charWidth * 2, this.charHeight);
      } else {
        this.charCtx.fillRect(0, 0, this.charWidth, this.charHeight);
      }

      PIXI.Texture.addToCache(PIXI.Texture.from(this.charCanvas.transferToImageBitmap()), key);
    }
    return PIXI.Texture.from(key);
  }

  private initChar(i: number, j: number) {
    if (!this.chars[i]) this.chars[i] = [];
    if (!this.chars[i][j]) {
      this.chars[i][j] = {
        sprite: new PIXI.Sprite(),
        bg: new PIXI.Sprite(),
      };
      this.charsContainer.addChild(this.chars[i][j].sprite);
      this.bgContainer.addChild(this.chars[i][j].bg);
    }
  }

  private printChar(i: number, j: number, char: string, hlId: number) {
    this.initChar(i, j);

    // Print char
    this.chars[i][j].char = char;
    this.chars[i][j].hlId = hlId;
    this.chars[i][j].sprite.texture = this.getCharTexture(char, hlId);
    this.chars[i][j].sprite.position.set((j - 1) * this.charWidth, i * this.charHeight);
    this.chars[i][j].sprite.visible = true;

    // Draw bg
    this.chars[i][j].bg.position.set(j * this.charWidth, i * this.charHeight);
    const bgColor = this.highlightTable[hlId]?.calculated?.bgColor;
    if (hlId !== 0 && bgColor && bgColor !== this.highlightTable[0]?.calculated?.bgColor) {
      this.chars[i][j].bg.texture = this.getBgTexture(bgColor, j);
      this.chars[i][j].bg.visible = true;
    } else {
      this.chars[i][j].bg.visible = false;
    }
  }

  private cursorBlinkOn() {
    this.cursorContainer.visible = true;
    this.renderer.render(this.stage);
  }

  private cursorBlinkOff() {
    this.cursorContainer.visible = false;
    this.renderer.render(this.stage);
  }

  private cursorBlink({
    blinkon,
    blinkoff,
    blinkwait,
  }: { blinkon?: number; blinkoff?: number; blinkwait?: number } = {}) {
    this.cursorContainer.visible = true;

    if (this.startCursorBlinkOnTimeout) clearTimeout(this.startCursorBlinkOnTimeout);
    if (this.startCursorBlinkOffTimeout) clearTimeout(this.startCursorBlinkOffTimeout);
    if (this.blinkOnCursorBlinkInterval) clearInterval(this.blinkOnCursorBlinkInterval);
    if (this.blinkOffCursorBlinkInterval) clearInterval(this.blinkOffCursorBlinkInterval);

    this.startCursorBlinkOnTimeout = null;
    this.startCursorBlinkOffTimeout = null;
    this.blinkOnCursorBlinkInterval = null;
    this.blinkOffCursorBlinkInterval = null;

    if (blinkoff && blinkon) {
      this.startCursorBlinkOffTimeout = setTimeout(() => {
        this.cursorBlinkOff();
        this.blinkOffCursorBlinkInterval = setInterval(this.cursorBlinkOff, blinkoff + blinkon);

        this.startCursorBlinkOnTimeout = setTimeout(() => {
          this.cursorBlinkOn();
          this.blinkOnCursorBlinkInterval = setInterval(this.cursorBlinkOn, blinkoff + blinkon);
        }, blinkoff);
      }, blinkwait);
    }
  }

  private clearCursor() {
    this.cursorBg.clear();
    this.cursorSprite.visible = false;
  }

  private redrawCursor() {
    const m = this.modeInfoSet && this.mode ? this.modeInfoSet[this.mode] : undefined;
    this.cursorBlink(m);

    if (!m) return;
    // TODO: check if cursor changed (char, hlId, etc)
    this.clearCursor();

    const hlId = m.attr_id === 0 ? -1 : m.attr_id;
    this.cursorBg.beginFill(getColorNum(this.highlightTable[hlId]?.calculated?.bgColor));

    if (m.cursor_shape === 'block') {
      this.cursorChar = this.chars[this.cursorPosition[0]][this.cursorPosition[1]].char || ' ';
      this.cursorSprite.texture = this.getCharTexture(this.cursorChar, hlId);
      this.cursorBg.drawRect(0, 0, this.charWidth, this.charHeight);
      this.cursorSprite.visible = true;
    } else if (m.cursor_shape === 'vertical') {
      const curWidth = m.cell_percentage
        ? Math.max(this.scale, Math.round((this.charWidth / 100) * m.cell_percentage))
        : this.scale;
      this.cursorBg.drawRect(0, 0, curWidth, this.charHeight);
    } else if (m.cursor_shape === 'horizontal') {
      const curHeight = m.cell_percentage
        ? Math.max(this.scale, Math.round((this.charHeight / 100) * m.cell_percentage))
        : this.scale;
      this.cursorBg.drawRect(0, this.charHeight - curHeight, this.charWidth, curHeight);
    }
    this.needRerender = true;
  }

  private repositionCursor(newCursor: [number, number]) {
    if (newCursor) this.cursorPosition = newCursor;
    const left = this.cursorPosition[1] * this.charWidth;
    const top = this.cursorPosition[0] * this.charHeight;
    this.cursorContainer.position.set(left, top);
    this.cursorEl.style.transform = `translate(${left}px, ${top}px)`;
    this.redrawCursor();
  }

  private optionSet = {
    guifont: (newFont: string) => {
      const [newFontFamily, newFontSize] = newFont.trim().split(':h');
      if (newFontFamily && newFontFamily !== '') {
        this.nvim.command(`VVset fontfamily=${newFontFamily.replace(/_/g, '\\ ')}`);
        if (newFontSize && newFontFamily !== '') {
          this.nvim.command(`VVset fontsize=${newFontSize}`);
        }
      }
    },
  };

  private reprintAllChars() {
    if (this.highlightTable[0]?.calculated?.bgColor) {
      document.body.style.background = this.highlightTable[0].calculated.bgColor;
      this.transport.send('set-background-color', this.highlightTable[0].calculated.bgColor);
    }

    PIXI.utils.clearTextureCache();
    for (let i = 0; i <= this.rows; i += 1) {
      for (let j = 0; j <= this.cols; j += 1) {
        this.initChar(i, j);
        const { char, hlId } = this.chars[i][j];
        if (char && isFinite(hlId)) {
          this.printChar(i, j, char, hlId as number);
        }
      }
    }
    this.needRerender = true;
  }

  private recalculateHighlightTable() {
    ((Object.keys(this.highlightTable) as unknown) as number[]).forEach((id) => {
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
        } = this.highlightTable[id].value || {};
        const r = reverse || standout;
        const fg = getColor(foreground, this.highlightTable[0]?.calculated?.fgColor) as string;
        const bg = getColor(background, this.highlightTable[0]?.calculated?.bgColor) as string;
        const sp = getColor(special, this.highlightTable[0]?.calculated?.spColor) as string;

        this.highlightTable[(id as unknown) as number].calculated = {
          fgColor: r ? bg : fg,
          bgColor: r ? fg : bg,
          spColor: sp,
          hiItalic: this.showItalic && !!italic,
          hiBold: this.showBold && !!bold,
          hiUnderline: this.showUnderline && !!underline,
          hiUndercurl: this.showUndercurl && !!undercurl,
          hiStrikethrough: this.showStrikethrough && !!strikethrough,
        };
      }
    });
    this.reprintAllChars();
  }

  private rerender = throttle(() => {
    this.renderer.render(this.stage);
  }, 1000 / this.TARGET_FPS);

  private rerenderIfNeeded() {
    if (this.needRerender) {
      this.needRerender = false;
      this.rerender();
    }
  }

  // https://github.com/neovim/neovim/blob/master/runtime/doc/ui.txt
  private redrawCmd: Partial<UiEventsHandlers> = {
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
      this.modeInfoSet = props[0][1].reduce(
        (r, modeInfo) => ({ ...r, [modeInfo.name]: modeInfo }),
        {},
      );
      this.redrawCursor();
    },

    option_set: (options) => {
      options.forEach(([option, value]) => {
        // @ts-expect-error TODO
        if (this.optionSet[option]) {
          // @ts-expect-error TODO
          this.optionSet[option](value);
        } else {
          // console.warn('Unknown option', option, value); // eslint-disable-line no-console
        }
      });
    },

    mode_change: (modes) => {
      [this.mode] = modes[modes.length - 1];
      this.redrawCursor();
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
      this.rerenderIfNeeded();
    },

    grid_resize: (props) => {
      /* eslint-disable prefer-destructuring */
      this.cols = props[0][1];
      this.rows = props[0][2];
      /* eslint-enable prefer-destructuring */

      if (
        this.cols * this.charWidth > this.renderer.width ||
        this.rows * this.charHeight > this.renderer.height
      ) {
        // Add extra column on the right to fill it with adjacent color to have a nice right border
        const width = (this.cols + 1) * this.charWidth;
        const height = this.rows * this.charHeight;

        this.screenEl.style.width = `${width}px`;
        this.screenEl.style.height = `${height}px`;

        this.renderer.resize(width, height);
        this.needRerender = true;
      }
    },

    default_colors_set: (props) => {
      const [foreground, background, special] = props[props.length - 1];

      const calculated = {
        bgColor: getColor(background, this.defaultBgColor) as string,
        fgColor: getColor(foreground, this.defaultFgColor) as string,
        spColor: getColor(special, this.defaultSpColor),
        hiItalic: false,
        hiBold: false,
        hiUnderline: false,
        hiUndercurl: false,
        hiStrikethrough: false,
      };
      if (!this.highlightTable[0] || !isEqual(this.highlightTable[0].calculated, calculated)) {
        this.highlightTable[0] = { calculated };
        this.highlightTable[-1] = {
          calculated: {
            ...calculated,
            bgColor: getColor(foreground, this.defaultFgColor) as string,
            fgColor: getColor(background, this.defaultBgColor) as string,
          },
        };
        this.recalculateHighlightTable();
      }
    },

    hl_attr_define: (props) => {
      props.forEach(([id, value]) => {
        this.highlightTable[id] = {
          value,
        };
      });
      this.recalculateHighlightTable();
    },

    grid_line: (props) => {
      for (let gridKey = 0, gridLength = props.length; gridKey < gridLength; gridKey += 1) {
        const row = props[gridKey][1];
        const col = props[gridKey][2];
        const cells = props[gridKey][3];

        let lineLength = 0;
        let currentHlId = 0;

        for (let cellKey = 0, cellsLength = cells.length; cellKey < cellsLength; cellKey += 1) {
          const [char, hlId, length = 1] = cells[cellKey];
          if (hlId !== undefined && isFinite(hlId)) {
            currentHlId = hlId;
          }
          for (let j = 0; j < length; j += 1) {
            this.printChar(row, col + lineLength + j, char, currentHlId);
          }
          lineLength += length;
        }
      }
      this.needRerender = true;
      if (
        this.chars[this.cursorPosition[0]] &&
        this.chars[this.cursorPosition[0]][this.cursorPosition[1]] &&
        this.cursorChar !== this.chars[this.cursorPosition[0]][this.cursorPosition[1]].char
      ) {
        this.redrawCursor();
      }
    },

    grid_clear: () => {
      this.cursorPosition = [0, 0];
      this.charsContainer.children.forEach((c) => {
        c.visible = false; // eslint-disable-line no-param-reassign
      });
      this.bgContainer.children.forEach((c) => {
        c.visible = false; // eslint-disable-line no-param-reassign
      });
      for (let i = 0; i <= this.rows; i += 1) {
        if (!this.chars[i]) this.chars[i] = [];
        for (let j = 0; j <= this.cols; j += 1) {
          this.initChar(i, j);
          this.chars[i][j].char = null;
        }
      }
      this.needRerender = true;
    },

    grid_destroy: () => {
      /* empty */
    },

    grid_cursor_goto: ([[_, ...newCursor]]) => {
      this.repositionCursor(newCursor);

      // Temporary workaround to fix cursor position in terminal mode. Nvim API does not send the very last cursor
      // position in terminal on redraw, but when you send any command to nvim, it redraws it correctly. Need to
      // investigate it and find a better permanent fix. Maybe this is a bug in nvim and then
      // TODO: file a ticket to nvim.
      this.nvim.getMode();
    },

    grid_scroll: ([[_grid, top, bottom, left, right, scrollCount]]) => {
      for (
        let i = scrollCount > 0 ? top : bottom - 1;
        scrollCount > 0 ? i <= bottom - scrollCount - 1 : i >= top - scrollCount;
        i += scrollCount > 0 ? 1 : -1
      ) {
        for (let j = left; j <= right - 1; j += 1) {
          const sourceI = i + scrollCount;

          this.initChar(i, j);
          this.initChar(sourceI, j);

          // Swap char to scroll to destination
          [this.chars[i][j], this.chars[sourceI][j]] = [this.chars[sourceI][j], this.chars[i][j]];

          // Update scrolled char sprite position
          if (this.chars[i][j].sprite) {
            this.chars[i][j].sprite.y = i * this.charHeight;
            this.chars[i][j].bg.y = i * this.charHeight;
          }

          // Clear and reposition old char
          if (this.chars[sourceI][j].sprite) {
            this.chars[sourceI][j].sprite.visible = false;
            this.chars[sourceI][j].bg.visible = false;
            this.chars[sourceI][j].sprite.y = sourceI * this.charHeight;
            this.chars[sourceI][j].bg.y = sourceI * this.charHeight;
          }
        }
      }
      this.needRerender = true;
    },
  };

  private handleSet = {
    fontfamily: (newFontFamily: string) => {
      this.fontFamily = `${newFontFamily}, ${DEFAULT_FONT_FAMILY}`;
    },

    fontsize: (newFontSize: string) => {
      this.fontSize = parseInt(newFontSize, 10);
    },

    letterspacing: (newLetterSpacing: string) => {
      this.letterSpacing = parseInt(newLetterSpacing, 10);
    },

    lineheight: (newLineHeight: string) => {
      this.lineHeight = parseFloat(newLineHeight);
    },

    bold: (value: boolean) => {
      this.showBold = value;
    },

    italic: (value: boolean) => {
      this.showItalic = value;
    },

    underline: (value: boolean) => {
      this.showUnderline = value;
    },

    undercurl: (value: boolean) => {
      this.showUndercurl = value;
    },

    strikethrough: (value: boolean) => {
      this.showStrikethrough = value;
    },
  };

  private redraw = (args: UiEventsArgs) => {
    args.forEach(([cmd, ...props]) => {
      const command = this.redrawCmd[cmd];
      if (command) {
        // @ts-expect-error TODO: find the way to type it without errors
        command(props);
      } else {
        console.warn('Unknown redraw command', cmd, props); // eslint-disable-line no-console
      }
    });
  };

  private setScale() {
    this.scale = this.isRetina() ? this.RETINA_SCALE : 1;
    this.screenContainer.style.transform = `scale(${1 / this.scale})`;
    this.screenContainer.style.width = `${this.scale * 100}%`;
    this.screenContainer.style.height = `${this.scale * 100}%`;

    // Detect when you drag between retina/non-retina displays
    window.matchMedia('screen and (min-resolution: 2dppx)').addListener(async () => {
      this.setScale();
      this.measureCharSize();
      await this.nvim.uiTryResize(this.cols, this.rows);
    });
  }

  /**
   * Return grid [col, row] coordinates by pixel coordinates.
   */
  public screenCoords(width: number, height: number): [col: number, row: number] {
    return [
      Math.floor((width * this.scale) / this.charWidth),
      Math.floor((height * this.scale) / this.charHeight),
    ];
  }

  private resize(forceRedraw = false) {
    const [newCols, newRows] = this.screenCoords(window.innerWidth, window.innerHeight);
    if (newCols !== this.cols || newRows !== this.rows || forceRedraw) {
      this.cols = newCols;
      this.rows = newRows;
      this.nvim.uiTryResize(this.cols, this.rows);
    }
  }

  private uiAttach() {
    [this.cols, this.rows] = this.screenCoords(window.innerWidth, window.innerHeight);
    this.nvim.uiAttach(this.cols, this.rows, { ext_linegrid: true });
    window.addEventListener(
      'resize',
      throttle(() => this.resize(), 1000 / this.TARGET_FPS),
    );
  }

  private updateSettings(newSettings: Settings, isInitial = false) {
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
      if (this.handleSet[key]) {
        requireRedraw = requireRedraw || requireRedrawProps.includes(key);
        requireRecalculateHighlight =
          requireRecalculateHighlight || requireRecalculateHighlightProps.includes(key);
        // @ts-expect-error TODO
        this.handleSet[key](newSettings[key]);
      }
    });

    if (requireRecalculateHighlight && !isInitial) {
      this.recalculateHighlightTable();
    }

    if (requireRedraw) {
      this.measureCharSize();
      PIXI.utils.clearTextureCache();
      if (!isInitial) {
        this.resize(true);
      }
    }
  }

  constructor({
    settings,
    transport,
    nvim,
  }: {
    settings: Settings;
    transport: Transport;
    nvim: Nvim;
  }) {
    this.nvim = nvim;
    this.transport = transport;

    this.initScreen();
    this.initCursor();
    this.setScale();

    this.nvim.on('redraw', this.redraw);

    this.transport.on('updateSettings', (s) => this.updateSettings(s));
    this.updateSettings(settings, true);

    this.uiAttach();
  }
}

export default Screen;
