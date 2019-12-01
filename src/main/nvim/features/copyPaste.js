import { clipboard } from 'electron';

import { getNvimByWindow } from '../nvimByWindow';

export const pasteMenuItem = async (_item, win) => {
  const nvim = getNvimByWindow(win);
  const clipboardText = clipboard.readText();
  nvim.paste(clipboardText, true, -1);
};

export const copyMenuItem = async (_item, win) => {
  const nvim = getNvimByWindow(win);
  const mode = await nvim.getShortMode();
  if (mode === 'v' || mode === 'V') {
    nvim.input('"*y');
  }
};

export const selectAllMenuItem = (_item, win) => {
  const nvim = getNvimByWindow(win);
  if (nvim) {
    nvim.input('ggVG');
  }
};
