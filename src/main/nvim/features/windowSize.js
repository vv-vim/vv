import { screen } from 'electron';
import { getInitialSettings, onChangeSettings } from '../settings';
import { getNvimByWindow } from '../nvimByWindow';

export const toggleFullScreenMenuItem = (_item, win) => {
  const nvim = getNvimByWindow(win);
  if (nvim) {
    nvim.command('VVset fullscreen!');
  }
};

const initWindowSize = ({ win, args }) => {
  const initialBounds = win.getBounds();
  let bounds = win.getBounds();
  let simpleFullScreen = false;
  let fullScreen = false;
  let isInitial = false;

  const set = {
    windowwidth: w => {
      if (w !== undefined) {
        let width = parseInt(w, 10);
        if (w.toString().indexOf('%') !== -1) {
          width = Math.round((screen.getPrimaryDisplay().workAreaSize.width * width) / 100);
        }
        bounds.width = width;
      }
    },
    windowheight: h => {
      if (h !== undefined) {
        let height = parseInt(h, 10);
        if (h.toString().indexOf('%') !== -1) {
          height = Math.round((screen.getPrimaryDisplay().workAreaSize.height * height) / 100);
        }
        bounds.height = height;
      }
    },
    windowleft: l => {
      if (l !== undefined) {
        let left = parseInt(l, 10);
        if (l.toString().indexOf('%') !== -1) {
          const displayWidth = screen.getPrimaryDisplay().workAreaSize.width;
          const winWidth = bounds.width;
          left = Math.round(((displayWidth - winWidth) * left) / 100);
        }
        bounds.x = left;
      }
    },
    windowtop: t => {
      if (t !== undefined) {
        let top = parseInt(t, 10);
        if (t.toString().indexOf('%') !== -1) {
          const displayHeight = screen.getPrimaryDisplay().workAreaSize.height;
          const winHeight = bounds.height;
          top = Math.round(((displayHeight - winHeight) * top) / 100);
        }
        bounds.y = top;
      }
    },
    fullscreen: value => {
      fullScreen = !!parseInt(value, 10);
      if (fullScreen) bounds = win.getBounds();
      if (simpleFullScreen) {
        win.setSimpleFullScreen(fullScreen);
      } else {
        win.setFullScreen(fullScreen);
      }
      win.webContents.focus();
    },
    simplefullscreen: value => {
      simpleFullScreen = !!parseInt(value, 10);
      if (simpleFullScreen && win.isFullScreen()) {
        win.setFullScreen(false);
        setTimeout(() => {
          win.setSimpleFullScreen(true);
          win.webContents.focus();
        }, 1);
      } else if (!simpleFullScreen && win.isSimpleFullScreen()) {
        win.setSimpleFullScreen(false);
        setTimeout(() => {
          win.setFullScreen(true);
          win.webContents.focus();
        }, 1);
      }
      win.setFullScreenable(!simpleFullScreen);
    },
  };

  const updateWindowSize = (newSettings, allSettings) => {
    let settings = newSettings;
    if (isInitial && allSettings.fullscreen === 0) {
      settings = allSettings;
      bounds = initialBounds;
      isInitial = false;
    }
    // Order is iportant.
    [
      'simplefullscreen',
      'fullscreen',
      'windowwidth',
      'windowheight',
      'windowleft',
      'windowtop',
    ].forEach(key => settings[key] !== undefined && set[key](settings[key]));
    if (!fullScreen) {
      win.setBounds(bounds);
      setTimeout(() => {
        bounds = win.getBounds();
      }, 1);
    }
  };

  updateWindowSize(getInitialSettings(args), getInitialSettings(args));
  isInitial = true;

  onChangeSettings(win, updateWindowSize);
};

export default initWindowSize;
