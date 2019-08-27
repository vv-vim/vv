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

export const zoomIn = (_item, win) => {
  win.zoomLevel += 1; // eslint-disable-line no-param-reassign
  nvimChangeZoom(win, 1)
  disableActualSizeItem(win);
};

export const zoomOut = (_item, win) => {
  win.zoomLevel -= 1; // eslint-disable-line no-param-reassign
  nvimChangeZoom(win, -1)
  disableActualSizeItem(win);
};

export const actualSize = (_item, win) => {
  nvimChangeZoom(win, -win.zoomLevel)
  win.zoomLevel = 0; // eslint-disable-line no-param-reassign
  disableActualSizeItem(win);
};

const zoom = ({ win }) => {
  win.on('focus', () => {
    disableActualSizeItem(win);
  });
}

export default zoom;
