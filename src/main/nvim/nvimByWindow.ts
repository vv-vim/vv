import { BrowserWindow } from 'electron';
import { Nvim } from './api';

const nvimByWindowId: Record<number, Nvim> = [];

export const getNvimByWindow = (winOrId?: number | BrowserWindow) => {
  if (!winOrId) {
    return null;
  }
  if (typeof winOrId === 'number') {
    return nvimByWindowId[winOrId];
  }
  if (winOrId.webContents) {
    return nvimByWindowId[winOrId.webContents.id];
  }
  return null;
};

export const setNvimByWindow = (win: BrowserWindow, nvim: Nvim) => {
  if (win.webContents) {
    nvimByWindowId[win.webContents.id] = nvim;
  }
};

export const deleteNvimByWindow = (win: BrowserWindow) => {
  if (win.webContents) {
    delete nvimByWindowId[win.webContents.id];
  }
};
