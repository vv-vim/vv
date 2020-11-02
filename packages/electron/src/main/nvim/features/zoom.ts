import { app, MenuItemConstructorOptions, BrowserWindow } from 'electron';
import { getNvimByWindow } from '@main/nvim/nvimByWindow';

const nvimChangeZoom = (win: BrowserWindow, level: number) => {
  const nvim = getNvimByWindow(win);
  if (nvim) {
    nvim.command(`VVset fontsize${level > 0 ? '+' : '-'}=${Math.abs(level)}`);
  }
};

const disableActualSizeItem = (win: BrowserWindow) => {
  const actualSize = app.applicationMenu?.getMenuItemById('actualSize');
  if (actualSize) {
    // @ts-ignore TODO: window custom params
    actualSize.enabled = win.zoomLevel !== 0;
  }
};

export const zoomInMenuItem: MenuItemConstructorOptions['click'] = (_item, win) => {
  if (win) {
    // @ts-ignore TODO: window custom params
    win.zoomLevel += 1; // eslint-disable-line no-param-reassign
    nvimChangeZoom(win, 1);
    disableActualSizeItem(win);
  }
};

export const zoomOutMenuItem: MenuItemConstructorOptions['click'] = (_item, win) => {
  if (win) {
    // @ts-ignore TODO: window custom params
    win.zoomLevel -= 1; // eslint-disable-line no-param-reassign
    nvimChangeZoom(win, -1);
    disableActualSizeItem(win);
  }
};

export const actualSizeMenuItem: MenuItemConstructorOptions['click'] = (_item, win) => {
  if (win) {
    // @ts-ignore TODO: window custom params
    nvimChangeZoom(win, -win.zoomLevel);
    // @ts-ignore TODO: window custom params
    win.zoomLevel = 0; // eslint-disable-line no-param-reassign
    disableActualSizeItem(win);
  }
};

const initZoom = ({ win }: { win: BrowserWindow }): void => {
  win.on('focus', () => {
    disableActualSizeItem(win);
  });
};

export default initZoom;
