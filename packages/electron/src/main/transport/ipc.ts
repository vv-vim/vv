import { ipcMain } from 'electron';

import { Transport, Args } from 'src/main/transport/types';

/**
 * Init transport between main and renderer to be used for main side.
 */
const transport = (newWin: Electron.BrowserWindow): Transport => {
  let win: Electron.BrowserWindow | null = newWin;
  const winId = win.id;

  win.on('closed', () => {
    win = null;
  });

  return {
    on: (channel, listener) => {
      if (win) {
        const ipcListener = ({ sender: { id } }: Electron.IpcMainEvent, ...args: Args) => {
          if (id === winId) {
            listener(...args);
          }
        };
        ipcMain.on(channel, ipcListener);
        win.on('closed', () => {
          ipcMain.removeListener(channel, ipcListener);
        });
      }
    },

    send: (channel, ...args) => {
      if (win) {
        win.webContents.send(channel, ...args);
      }
    },
  };
};

export default transport;
