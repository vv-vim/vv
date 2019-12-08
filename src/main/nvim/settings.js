import debounce from 'lodash/debounce';

import store from '../lib/store';
import getColor from '../../lib/getColor';

const getDefaultSettings = () => ({
  fullscreen: 0,
  simplefullscreen: 1,
  bold: 1,
  italic: 1,
  underline: 1,
  undercurl: 1,
  fontfamily: 'monospace',
  fontsize: 12,
  lineheight: 1.25,
  letterspacing: 0,
  reloadchanged: 0,
  defaultfgcolor: 'rgb(255,255,255)',
  defaultbgcolor: 'rgb(0,0,0)',
  defaultspcolor: 'rgb(255,255,255)',
  quitoncloselastwindow: 0,
});

const hasCustomConfig = (args = []) => args.indexOf('-u') !== -1;

/**
 * Get saved settings if we have them, default settings otherwise.
 * If you run app with -u flag, return default settings.
 * */
export const getSettings = (args = []) => {
  if (hasCustomConfig(args)) {
    return getDefaultSettings();
  }
  return {
    ...getDefaultSettings(),
    ...store.get('lastSettings'),
  };
};

const onChangeSettingsCallbacks = {};

export const onChangeSettings = (win, callback) => {
  if (!onChangeSettingsCallbacks[win.webContents.id]) {
    onChangeSettingsCallbacks[win.webContents.id] = [];
  }
  onChangeSettingsCallbacks[win.webContents.id].push(callback);
};

const initSettings = ({ win, nvim, args }) => {
  let initialSettings = getSettings(args);
  let settings = getDefaultSettings();

  let newSettings = {};

  const applyAllSettings = async () => {
    settings = {
      ...settings,
      ...newSettings,
    };

    // If we have initial settings newSetting will be only those that different from initialSettings. We
    // aleady applied initialSettings when we created a window.
    // Also store default colors to settings to avoid blinks on init.
    if (initialSettings && !hasCustomConfig(args)) {
      const highlight = await nvim.getHlByName('Normal', true);
      settings.defaultbgcolor = getColor(highlight.background, initialSettings.defaultbgcolor);
      settings.defaultfgcolor = getColor(highlight.foreground, initialSettings.defaultfgcolor);
      settings.defaultspcolor = getColor(highlight.foreground, initialSettings.defaultfgcolor);

      newSettings = Object.keys(settings).reduce((result, key) => {
        if (initialSettings[key] !== settings[key]) {
          return {
            ...result,
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
      onChangeSettingsCallbacks[win.webContents.id].forEach(c => c(newSettings, settings));
    }

    newSettings = {};
  };

  const debouncedApplyAllSettings = debounce(applyAllSettings, 10);

  const applySetting = ([option, props]) => {
    if (props !== null) {
      newSettings[option] = props;
      debouncedApplyAllSettings();
    }
  };

  nvim.on('vv:set', applySetting);
};

export default initSettings;
