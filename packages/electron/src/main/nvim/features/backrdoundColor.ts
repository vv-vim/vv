import type { BrowserWindow } from 'electron';
import type { Transport } from '@vvim/nvim';

/**
 * Change Electron window background color depending when renderer ask for it.
 */
const backroundColor = ({ transport, win }: { transport: Transport; win: BrowserWindow }): void => {
  transport.on('set-background-color', (bgColor: string) => {
    win.setBackgroundColor(bgColor);
  });
};

export default backroundColor;
