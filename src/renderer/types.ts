export type NvimCommand<R extends any> = (...args: any[]) => Promise<R>;

export type Nvim = {
  on: (method: string, callback: (...p: any[]) => void) => void;
  off: (method: string, callback: () => void) => void;
  send: (customId: number | null, command: string, ...params: any[]) => Promise<any>;

  eval: NvimCommand<any>;
  callFunction: NvimCommand<any>;
  command: NvimCommand<any>;
  input: NvimCommand<any>;
  inputMouse: NvimCommand<any>;
  getMode: NvimCommand<{ mode: string }>;
  uiTryResize: NvimCommand<any>;
  uiAttach: NvimCommand<any>;
  subscribe: NvimCommand<any>;
  getHlByName: NvimCommand<any>;
  paste: NvimCommand<any>;

  getShortMode: () => Promise<string>;
};

type BooleanSetting = 0 | 1;

export type Settings = {
  fullscreen: BooleanSetting;
  simplefullscreen: BooleanSetting;
  bold: BooleanSetting;
  italic: BooleanSetting;
  underline: BooleanSetting;
  undercurl: BooleanSetting;
  strikethrough: BooleanSetting;
  fontfamily: string;
  fontsize: string; // TODO: number
  lineheight: string; // TODO: number
  letterspacing: string; // TODO: number
  reloadchanged: BooleanSetting;
  quitoncloselastwindow: BooleanSetting;
  autoupdateinterval: string; // TODO: number
  openInProject: BooleanSetting;
};
