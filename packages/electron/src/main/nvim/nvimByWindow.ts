import type { BrowserWindow } from 'electron';
import type Nvim from '@vvim/nvim';

const nvimByWindowId: Record<number, Nvim> = [];

export const getNvimByWindow = (winOrId?: number | BrowserWindow): Nvim | null => {
  if (!winOrId) {
    return null;
  }
  if (typeof winOrId === 'number') {
    return nvimByWindowId[winOrId];
  }
  if (winOrId.webContents) {
    return nvimByWindowId[winOrId.id];
  }
  return null;
};

export const setNvimByWindow = (win: BrowserWindow, nvim: Nvim): void => {
  if (win.webContents) {
    nvimByWindowId[win.id] = nvim;
  }
};

export const deleteNvimByWindow = (win: BrowserWindow): void => {
  if (win.webContents) {
    delete nvimByWindowId[win.id];
  }
};
