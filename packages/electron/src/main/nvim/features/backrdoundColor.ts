import type { BrowserWindow } from 'electron';
import type { RemoteTransport } from '@vvim/nvim';

/**
 * Change Electron window background color depending when renderer ask for it.
 */
const backroundColor = ({
  transport,
  win,
}: {
  transport: RemoteTransport;
  win: BrowserWindow;
}): void => {
  transport.on('set-background-color', (bgColor: string) => {
    win.setBackgroundColor(bgColor);
  });
};

export default backroundColor;
