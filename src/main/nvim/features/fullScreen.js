import { onChangeSettings } from '../settings';
import { getNvimByWindow } from '../nvimByWindow';

export const toggleFullScreenMenuItem = (_item, win) => {
  const nvim = getNvimByWindow(win);
  if (nvim) {
    nvim.command('VVset fullscreen!');
  }
};

const initFullScreen = ({ win }) => {
  let simpleFullScreen = true;

  const handleSet = {
    fullscreen: value => {
      const boolValue = !!parseInt(value, 10);
      if (simpleFullScreen) {
        win.setSimpleFullScreen(boolValue);
      } else {
        win.setFullScreen(boolValue);
      }
      win.webContents.focus();
    },
    simplefullscreen: value => {
      simpleFullScreen = !!parseInt(value, 10);
      if (simpleFullScreen && win.isFullScreen()) {
        win.setFullScreen(false);
        win.setSimpleFullScreen(true);
        win.webContents.focus();
      } else if (!simpleFullScreen && win.isSimpleFullScreen()) {
        win.setSimpleFullScreen(false);
        win.setFullScreen(true);
        win.webContents.focus();
      }
      win.setFullScreenable(!simpleFullScreen);
    },
  };

  onChangeSettings(win, settings => {
    Object.keys(settings).forEach(key => {
      if (handleSet[key]) {
        handleSet[key](settings[key]);
      }
    });
  });

  return handleSet;
};

export default initFullScreen;
