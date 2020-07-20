import Store from 'electron-store';

type BooleanSetting = 0 | 1;

export type Settings = {
  fullscreen: BooleanSetting;
  simplefullscreen: BooleanSetting;
  bold: BooleanSetting;
  italic: BooleanSetting;
  underline: BooleanSetting;
  undercurl: BooleanSetting;
  fontfamily: string;
  fontsize: string; // TODO: number
  lineheight: string; // TODO: number
  letterspacing: string; // TODO: number
  reloadchanged: BooleanSetting;
  quitoncloselastwindow: BooleanSetting;
  autoupdateinterval: string; // TODO: number
  /**
   * WIP for https://github.com/vv-vim/vv/issues/36
   */
  openInProject: BooleanSetting;
};

type StoreData = {
  lastSettings: Settings;
  autoUpdate: {
    lastCheckedForUpdate: number;
  };
  'autoUpdate.lastCheckedForUpdate': number;
};

const store = new Store<StoreData>();

export default store;
