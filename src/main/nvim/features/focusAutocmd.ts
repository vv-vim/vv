import { BrowserWindow } from 'electron';
import { Nvim } from '../api';

const focusAutocmd = ({ win, nvim }: { win: BrowserWindow; nvim: Nvim }) => {
  win.on('focus', () => {
    nvim.command('doautocmd FocusGained');
  });

  win.on('blur', () => {
    nvim.command('doautocmd FocusLost');
  });
};

export default focusAutocmd;
