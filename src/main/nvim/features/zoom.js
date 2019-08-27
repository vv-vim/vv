import { app } from 'electron';
import { getNvimByWindow } from '../nvimByWindow';

const nvimChangeZoom = (win, level) => {
  const nvim = getNvimByWindow(win);
  if (nvim) {
    nvim.command(`VVset fontsize${level > 0 ? '+' : '-'}=${Math.abs(level)}`);
  }
};

const disableActualSizeItem = (win) => {
  if (app.getApplicationMenu()) {
    app.getApplicationMenu().getMenuItemById('actualSize').enabled = win.zoomLevel !== 0;
  }
};

export const zoomInMenuItem = (_item, win) => {
  win.zoomLevel += 1; // eslint-disable-line no-param-reassign
  nvimChangeZoom(win, 1)
  disableActualSizeItem(win);
};

export const zoomOutMenuItem = (_item, win) => {
  win.zoomLevel -= 1; // eslint-disable-line no-param-reassign
  nvimChangeZoom(win, -1)
  disableActualSizeItem(win);
};

export const actualSizeMenuItem = (_item, win) => {
  nvimChangeZoom(win, -win.zoomLevel)
  win.zoomLevel = 0; // eslint-disable-line no-param-reassign
  disableActualSizeItem(win);
};

const initZoom = ({ win }) => {
  win.on('focus', () => {
    disableActualSizeItem(win);
  });
}

export default initZoom;
