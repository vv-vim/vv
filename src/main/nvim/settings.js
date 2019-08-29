import debounce from 'lodash/debounce';

import store from '../../lib/store';

const defaultSettings = {
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
  windowwidth: '80%',
  windowheight: '80%',
  windowleft: '50%',
  windowtop: '50%',
};

// Store initial settings to make window open faster. When window is shown current settings are
// stored to initialSettings. And next time when new window is created we use these settings by
// default and change it if settings from vim config are changed.
export const getInitialSettings = () => store.get('initialSettings') || defaultSettings;

const onChangeSettingsCallbacks = {};

export const onChangeSettings = (win, callback) => {
  if (!onChangeSettingsCallbacks[win.webContents.id]) {
    onChangeSettingsCallbacks[win.webContents.id] = [];
  }
  onChangeSettingsCallbacks[win.webContents.id].push(callback);
}

const initSettings = ({ win, nvim }) => {
  let initialSettings = getInitialSettings();
  let settings = defaultSettings;

  let newSettings = {};

  const applyAllSettings = () => {
    Object.keys(newSettings).forEach(key => {
      if (settings[key] !== newSettings[key]) {
        settings[key] = newSettings[key];
      }
    });

    if (initialSettings) {
      newSettings = Object.keys(settings).reduce((result, key) => {
        if (initialSettings[key] !== settings[key]) {
          return {
            ...result,
            [key]: settings[key],
          }
        }
        return result;
      }
      ,{});
      store.set('initialSettings', settings);
      initialSettings = null;
    }

    win.webContents.send('updateSettings', newSettings, settings);
    if (onChangeSettingsCallbacks[win.webContents.id]) {
      onChangeSettingsCallbacks[win.webContents.id].forEach(c => c(newSettings, settings));
    }

    newSettings = {};
  };

  const debouncedApplyAllSettings = debounce(applyAllSettings, 10);

  const applySetting = (_method, [option, props]) => {
    if (props !== null) {
      newSettings[option] = props;
      debouncedApplyAllSettings();
    }
  }

  nvim.on('vv:set', applySetting);
};

export default initSettings;
