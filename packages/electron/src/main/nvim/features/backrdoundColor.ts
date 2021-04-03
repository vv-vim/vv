import type { Transport } from 'src/main/transport/types';
import type { BrowserWindow } from 'electron';

/**
 * Change Electron window background color depending when renderer ask for it.
 */
const backroundColor = ({ transport, win }: { transport: Transport; win: BrowserWindow }): void => {
  transport.on('set-background-color', (bgColor: string) => {
    win.setBackgroundColor(bgColor);
  });
};

export default backroundColor;
