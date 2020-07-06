import debounce from 'lodash/debounce';
import { BrowserWindow } from 'electron';
import { Nvim } from './api';

import store, { Settings } from '../lib/store';

export { Settings } from '../lib/store';

export type SettingsCallback = (newSettings: Partial<Settings>, allSettings: Settings) => void;

const getDefaultSettings = (): Settings => ({
  fullscreen: 0,
  simplefullscreen: 1,
  bold: 1,
  italic: 1,
  underline: 1,
  undercurl: 1,
  fontfamily: 'monospace',
  fontsize: '12',
  lineheight: '1.25',
  letterspacing: '0',
  reloadchanged: 0,
  quitoncloselastwindow: 0,
  autoupdateinterval: '1440', // One day, 60*24 minutes
});

let hasCustomConfig = false;

/**
 * Get saved settings if we have them, default settings otherwise.
 * If you run app with -u flag, return default settings.
 * */
export const getSettings = (): Settings => {
  if (hasCustomConfig) {
    return getDefaultSettings();
  }
  return {
    ...getDefaultSettings(),
    ...store.get('lastSettings'),
  };
};

const onChangeSettingsCallbacks: Record<string, SettingsCallback[]> = {};

export const onChangeSettings = (win: BrowserWindow, callback: SettingsCallback) => {
  if (!onChangeSettingsCallbacks[win.webContents.id]) {
    onChangeSettingsCallbacks[win.webContents.id] = [];
  }
  onChangeSettingsCallbacks[win.webContents.id].push(callback);
};

const initSettings = ({ win, nvim, args }: { win: BrowserWindow; nvim: Nvim; args: string[] }) => {
  hasCustomConfig = args.indexOf('-u') !== -1;
  let initialSettings: Settings | null = getSettings();
  let settings = getDefaultSettings();

  let newSettings: Partial<Settings> = {};

  const applyAllSettings = async () => {
    settings = {
      ...settings,
      ...newSettings,
    };

    // If we have initial settings newSetting will be only those that different from initialSettings. We
    // aleady applied initialSettings when we created a window.
    // Also store default colors to settings to avoid blinks on init.
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
    store.set('lastSettings', settings);

    win.webContents.send('updateSettings', newSettings, settings);
    if (onChangeSettingsCallbacks[win.webContents.id]) {
      onChangeSettingsCallbacks[win.webContents.id].forEach((c) => c(newSettings, settings));
    }

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
