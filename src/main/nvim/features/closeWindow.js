import { getNvimByWindow } from '../nvimByWindow';

// eslint-disable-next-line import/prefer-default-export
export const closeWindowMenuItem = async (_item, win) => {
  const nvim = getNvimByWindow(win);
  if (nvim) {
    const isNotLastWindow = await nvim.eval('tabpagenr("$") > 1 || winnr("$") > 1');
    if (isNotLastWindow) {
      nvim.command(`q`);
    } else {
      win.close();
    }
  }
};
