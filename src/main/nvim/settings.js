import debounce from 'lodash/debounce';

import store from '../lib/store';
import getColor from '../../lib/getColor';

export const getDefaultSettings = () => {
  return {
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
    defaultfgcolor: 'rgb(255,255,255)',
    defaultbgcolor: 'rgb(0,0,0)',
    defaultspcolor: 'rgb(255,255,255)',
  };
};

const customConfig = (args = []) => args.indexOf('-u') !== -1;

// Store initial settings to make window open faster. When window is shown current settings are
// stored to initialSettings. And next time when new window is created we use these settings by
// default and change it if settings from vim config are changed.
let initialSettingsCache;
export const getInitialSettings = (args = []) => {
  if (customConfig(args)) {
    return getDefaultSettings();
  }
  if (!initialSettingsCache) {
    initialSettingsCache = store.get('initialSettings');
  }
  return initialSettingsCache || getDefaultSettings();
};

const onChangeSettingsCallbacks = {};

export const onChangeSettings = (win, callback) => {
  if (!onChangeSettingsCallbacks[win.webContents.id]) {
    onChangeSettingsCallbacks[win.webContents.id] = [];
  }
  onChangeSettingsCallbacks[win.webContents.id].push(callback);
};

const initSettings = ({ win, nvim, args }) => {
  let initialSettings = getInitialSettings(args);
  const settings = getDefaultSettings();

  let newSettings = {};

  const applyAllSettings = async () => {
    Object.keys(newSettings).forEach(key => {
      if (settings[key] !== newSettings[key]) {
        settings[key] = newSettings[key];
      }
    });

    // If we have initial settings, store current settings.
    // newSetting will be only those that different from initialSettings.
    // Don't save settings if it is custom config
    if (initialSettings && !customConfig(args)) {
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
      store.set('initialSettings', settings);
      initialSettingsCache = settings;
      initialSettings = null;
    }

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
