import debounce from 'lodash/debounce';

import type Nvim from '@vvim/nvim';
import type { Transport } from 'src/server/transport/types';

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

export type SettingsCallback = (newSettings: Partial<Settings>, allSettings: Settings) => void;

export const getDefaultSettings = (): Settings => ({
  fullscreen: 0,
  simplefullscreen: 1,
  bold: 1,
  italic: 1,
  underline: 1,
  undercurl: 1,
  strikethrough: 1,
  fontfamily: 'monospace',
  fontsize: '12',
  lineheight: '1.25',
  letterspacing: '0',
  reloadchanged: 0,
  quitoncloselastwindow: 0,
  autoupdateinterval: '1440', // One day, 60*24 minutes
  openInProject: 0,
});

let hasCustomConfig = false;

const initSettings = ({
  nvim,
  args,
  transport,
}: {
  nvim: Nvim;
  args?: string[];
  transport: Transport;
}): void => {
  hasCustomConfig = args?.indexOf('-u') !== -1;
  let initialSettings: Settings | null = getDefaultSettings();
  let settings = getDefaultSettings();

  let newSettings: Partial<Settings> = {};

  const applyAllSettings = async () => {
    settings = {
      ...settings,
      ...newSettings,
    };

    // If we have initial settings newSetting will be only those that different from initialSettings. We
    // aleady applied initialSettings when we created a window.
    if (initialSettings && !hasCustomConfig) {
      newSettings = Object.keys(settings).reduce<Partial<Settings>>((result, key) => {
        // @ts-expect-error TODO FIXME
        if (initialSettings[key] !== settings[key]) {
          return {
            ...result,
            // @ts-expect-error TODO FIXME
            [key]: settings[key],
          };
        }
        return result;
      }, {});
      initialSettings = null;
    }

    transport.send('updateSettings', newSettings, settings);

    newSettings = {};
  };

  const debouncedApplyAllSettings = debounce(applyAllSettings, 10);

  const applySetting = <K extends keyof Settings>([option, props]: [K, Settings[K]]) => {
    if (props !== null) {
      newSettings[option] = props;
      debouncedApplyAllSettings();
    }
  };

  nvim.on<[keyof Settings, Settings[keyof Settings]]>('vv:set', applySetting);
};

export default initSettings;
