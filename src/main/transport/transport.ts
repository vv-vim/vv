import { ipcMain, BrowserWindow } from 'electron';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Args = any[];

type Listener = (...args: Args) => void;

export type Transport = {
  on: (channel: string, listener: Listener) => void;
  send: (channel: string, ...args: Args) => void;
};

/**
 * Transport between main and renderer.
 * This is WIP. Adding this abstraction on top of ipcMain to be able to switch to websockets or smth
 * for server mode.
 */
const transport = (win: BrowserWindow): Transport => ({
  /**
   * Receive message from renderer.
   */
  on: (channel, listener) => {
    ipcMain.on(channel, ({ sender: { id } }, ...args) => {
      if (id === win.webContents.id) {
        listener(...args);
      }
    });
  },

  /**
   * Send message to renderer.
   */
  send: (channel, ...args) => {
    win.webContents.send(channel, ...args);
  },
});

export default transport;
