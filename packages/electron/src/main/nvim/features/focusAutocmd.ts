import { BrowserWindow } from 'electron';

import type Nvim from '@vvim/nvim';

/**
 * Emit FocusGained or FocusLost autocmd when app window get or loose focus.
 * https://neovim.io/doc/user/autocmd.html#FocusGained
 */
const focusAutocmd = ({ win, nvim }: { win: BrowserWindow; nvim: Nvim }): void => {
  win.on('focus', () => {
    nvim.command('doautocmd FocusGained');
  });

  win.on('blur', () => {
    nvim.command('doautocmd FocusLost');
  });
};

export default focusAutocmd;
