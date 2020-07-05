import { clipboard, MenuItemConstructorOptions } from 'electron';

import { getNvimByWindow } from '../nvimByWindow';

export const pasteMenuItem: MenuItemConstructorOptions['click'] = async (_item, win) => {
  const nvim = getNvimByWindow(win);
  if (nvim) {
    const clipboardText = clipboard.readText();
    nvim.paste(clipboardText, true, -1);
  }
};

export const copyMenuItem: MenuItemConstructorOptions['click'] = async (_item, win) => {
  const nvim = getNvimByWindow(win);
  if (nvim) {
    const mode = await nvim.getShortMode();
    if (mode === 'v' || mode === 'V') {
      nvim.input('"*y');
    }
  }
};

export const selectAllMenuItem: MenuItemConstructorOptions['click'] = (_item, win) => {
  const nvim = getNvimByWindow(win);
  if (nvim) {
    nvim.input('ggVG');
  }
};
