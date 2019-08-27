import { clipboard } from 'electron';

import { getNvimByWindow } from '../nvimByWindow';

export const paste = async (_item, win) => {
  const clipboardText = clipboard.readText().replace(/</g, '<lt>');
  const nvim = getNvimByWindow(win);
  const mode = await nvim.getShortMode();
  if (mode === 'i') {
    await nvim.command('set paste');
    await nvim.input(clipboardText);
    await nvim.command('set nopaste');
  } else if (['n', 'v', 'V', 's', 'S'].includes(mode)) {
    nvim.input('"*p');
  } else {
    nvim.input(clipboardText);
  }
};

export const copy = async (_item, win) => {
  const nvim = getNvimByWindow(win);
  const mode = await nvim.getShortMode();
  if (mode === 'v' || mode === 'V') {
    nvim.input('"*y');
  }
};

export const selectAll = (_item, win) => {
  const nvim = getNvimByWindow(win);
  if (nvim) {
    nvim.input('ggVG');
  }
};
