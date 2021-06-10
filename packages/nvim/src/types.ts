/* eslint-disable camelcase */

import type { EventEmitter } from 'events';

// Only use relative imports here because https://github.com/microsoft/TypeScript/issues/32999#issuecomment-523558695
// TODO: Bundle .d.ts or something
import type { UiEvents as UiEventsOriginal } from './__generated__/uiEventTypes';

export type RequestMessage = [0, number, string, any[]];
export type ResponseMessage = [1, number, any, any];
export type NotificationMessage = [2, string, any[]];

export type MessageType = RequestMessage | ResponseMessage | NotificationMessage;
export type ReadCallback = (message: MessageType) => void;
export type OnCloseCallback = () => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Args = any[];

export type Listener = (...args: Args) => void;

/**
 * Remote transport between server or main and renderer.
 * Use emitter events (`on`, `once` etc) for receiving message, and `send` to sent message to other side.
 */
export type RemoteTransport = EventEmitter & {
  /**
   * Send message to remote
   */
  send: (channel: string, ...args: Args) => void;
};

export type NvimTransport = {
  /**
   * Send message to nvim api.
   * https://neovim.io/doc/user/api.html
   */
  write: (id: number, command: string, params: string[]) => void;

  /**
   * Add callback when data from nvim API received. Message should be in unpacked RPC format:
   * https://github.com/msgpack-rpc/msgpack-rpc/blob/master/spec.md#messagepack-rpc-protocol-specification
   */
  read: (callback: ReadCallback) => void;

  /**
   * Add callback that will be called when transport is closed, i.e. nvim probably closed.
   */
  onClose: (callback: OnCloseCallback) => void;
};

// Manual refine of the auto-generated UiEvents
// More info: https://neovim.io/doc/user/ui.html

export type ModeInfo = {
  cursor_shape: 'block' | 'horizontal' | 'vertical';
  cell_percentage: number;
  blinkwait: number;
  blinkon: number;
  blinkoff: number;
  attr_id: number;
  attr_id_lm: number;
  short_name: string; // TODO: union
  name: string; // TODO: union
  mouse_shape: number;
};

// TODO: refine this type as a union of `[option, value]` with the correct value type for each option.
export type OptionSet = [
  option:
    | 'arabicshape'
    | 'ambiwidth'
    | 'emoji'
    | 'guifont'
    | 'guifontwide'
    | 'linespace'
    | 'mousefocus'
    | 'pumblend'
    | 'showtabline'
    | 'termguicolors'
    | 'rgb'
    | 'ext_cmdline'
    | 'ext_popupmenu'
    | 'ext_tabline'
    | 'ext_wildmenu'
    | 'ext_messages'
    | 'ext_linegrid'
    | 'ext_multigrid'
    | 'ext_hlstate'
    | 'ext_termcolors',
  value: boolean | string,
];

export type HighlightAttrs = {
  foreground?: number;
  background?: number;
  special?: number;
  reverse?: boolean;
  standout?: boolean;
  italic?: boolean;
  bold?: boolean;
  underline?: boolean;
  undercurl?: boolean;
  strikethrough?: boolean;
  blend?: number;
};

export type Cell = [text: string, hl_id?: number, repeat?: number];

type UiEventsPatch = {
  mode_info_set: [enabled: boolean, cursor_styles: ModeInfo[]];
  option_set: OptionSet;
  hl_attr_define: [id: number, rgb_attrs: HighlightAttrs, cterm_attrs: HighlightAttrs, info: []];
  grid_line: [grid: number, row: number, col_start: number, cells: Cell[]];
};

export type UiEvents = Omit<UiEventsOriginal, keyof UiEventsPatch> & UiEventsPatch;

export type UiEventsHandlers = {
  [Key in keyof UiEvents]: (params: Array<UiEvents[Key]>) => void;
};

type UiEventsArgsByKey = {
  [Key in keyof UiEvents]: [Key, ...Array<UiEvents[Key]>];
};

export type UiEventsArgs = Array<UiEventsArgsByKey[keyof UiEventsArgsByKey]>;
