import { screen, MenuItemConstructorOptions, BrowserWindow } from 'electron';

import { getSettings, onChangeSettings, SettingsCallback } from '@main/nvim/settings';
import { getNvimByWindow } from '@main/nvim/nvimByWindow';

export const toggleFullScreenMenuItem: MenuItemConstructorOptions['click'] = (_item, win) => {
  const nvim = getNvimByWindow(win);
  if (nvim) {
    nvim.command('VVset fullscreen!');
  }
};

const initWindowSize = ({ win }: { win: BrowserWindow }): void => {
  const initialBounds = win.getBounds();
  let bounds = win.getBounds();
  let simpleFullScreen = false;
  let fullScreen = false;
  let isInitial = false;

  const set = {
    windowwidth: (w?: string) => {
      if (w !== undefined) {
        let width = parseInt(w, 10);
        if (w.toString().indexOf('%') !== -1) {
          width = Math.round((screen.getPrimaryDisplay().workAreaSize.width * width) / 100);
        }
        bounds.width = width;
      }
    },
    windowheight: (h?: string) => {
      if (h !== undefined) {
        let height = parseInt(h, 10);
        if (h.toString().indexOf('%') !== -1) {
          height = Math.round((screen.getPrimaryDisplay().workAreaSize.height * height) / 100);
        }
        bounds.height = height;
      }
    },
    windowleft: (l?: string) => {
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
    windowtop: (t?: string) => {
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
    fullscreen: (value: string) => {
      fullScreen = !!parseInt(value, 10);
      if (fullScreen) bounds = win.getBounds();
      if (simpleFullScreen) {
        win.setSimpleFullScreen(fullScreen);
      } else {
        win.setFullScreen(fullScreen);
      }
      win.webContents.focus();
    },
    simplefullscreen: (value: string) => {
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
      win.fullScreenable = !simpleFullScreen; // eslint-disable-line no-param-reassign
    },
  };

  const updateWindowSize: SettingsCallback = (newSettings, allSettings) => {
    let settings = newSettings;
    if (!fullScreen) {
      bounds = win.getBounds();
    }
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
      // @ts-ignore FIXME
    ].forEach((key) => settings[key] !== undefined && set[key](settings[key]));
    if (!fullScreen) {
      win.setBounds(bounds);
    }
  };

  updateWindowSize(getSettings(), getSettings());
  isInitial = true;

  onChangeSettings(win, updateWindowSize);
};

export default initWindowSize;
