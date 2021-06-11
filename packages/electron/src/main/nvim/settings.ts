import debounce from 'lodash/debounce';

import type { BrowserWindow } from 'electron';
import type { Nvim, RemoteTransport } from '@vvim/nvim';

import store, { Settings } from 'src/main/lib/store';

export type SettingsCallback = (newSettings: Partial<Settings>, allSettings: Settings) => void;

const getDefaultSettings = (): Settings => ({
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

/**
 * Get saved settings if we have them, default settings otherwise.
 * If you run app with -u flag, return default settings.
 */
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

export const onChangeSettings = (win: BrowserWindow, callback: SettingsCallback): void => {
  if (!onChangeSettingsCallbacks[win.id]) {
    onChangeSettingsCallbacks[win.id] = [];
  }
  onChangeSettingsCallbacks[win.id].push(callback);
};

const initSettings = ({
  win,
  nvim,
  args,
  transport,
}: {
  win: BrowserWindow;
  nvim: Nvim;
  args: string[];
  transport: RemoteTransport;
}): void => {
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
    store.set('lastSettings', settings);

    transport.send('updateSettings', newSettings, settings);
    if (onChangeSettingsCallbacks[win.id]) {
      onChangeSettingsCallbacks[win.id].forEach((c) => c(newSettings, settings));
    }

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
