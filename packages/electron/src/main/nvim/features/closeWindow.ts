import { MenuItemConstructorOptions } from 'electron';

import { getNvimByWindow } from 'src/main/nvim/nvimByWindow';

export const closeWindowMenuItem: MenuItemConstructorOptions['click'] = async (_item, win) => {
  if (win) {
    const nvim = getNvimByWindow(win);
    if (nvim) {
      const isNotLastWindow = await nvim.eval('tabpagenr("$") > 1 || winnr("$") > 1');
      if (isNotLastWindow) {
        nvim.command(`q`);
      } else {
        win.close();
      }
    }
  }
};
