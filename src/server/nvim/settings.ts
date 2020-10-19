import debounce from 'lodash/debounce';

import { Settings } from '@main/lib/store';

import { Nvim } from '@main/nvim/api';
import { Transport } from '@server/transport/types';

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
        // @ts-ignore TODO FIXME
        if (initialSettings[key] !== settings[key]) {
          return {
            ...result,
            // @ts-ignore TODO FIXME
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

  const applySetting = ([option, props]: [keyof Settings, any]) => {
    if (props !== null) {
      newSettings[option] = props;
      debouncedApplyAllSettings();
    }
  };

  nvim.on('vv:set', applySetting);
};

export default initSettings;
