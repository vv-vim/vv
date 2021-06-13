import { ipcMain } from 'electron';
import { EventEmitter } from 'events';

import { Transport, Args } from '@vvim/nvim';

/**
 * Init transport between main and renderer to be used for main side.
 */
class IpcTransport extends EventEmitter implements Transport {
  win: Electron.BrowserWindow;

  closed = false;

  ipc: Electron.IpcMain;

  constructor(win: Electron.BrowserWindow, ipc = ipcMain) {
    super();

    this.win = win;

    this.ipc = ipc;

    win.on('closed', () => {
      this.closed = true;
    });

    this.on('newListener', (eventName: string) => {
      if (!this.listenerCount(eventName)) {
        this.ipc.on(eventName, this.handleEvent);
        this.win.on('closed', () => {
          this.ipc.removeListener(eventName, this.handleEvent);
        });
      }
    });

    this.on('removeListener', (eventName: string) => {
      if (!this.listenerCount(eventName)) {
        this.ipc.removeListener(eventName, this.handleEvent);
      }
    });
  }

  handleEvent = (event: Electron.IpcMainEvent, ...args: Args): void => {
    const {
      type,
      sender: { id },
    } = event;
    if (id === this.win.id) {
      this.emit(type, ...args);
    }
  };

  send(channel: string, ...args: any[]): void {
    if (!this.closed) {
      this.win.webContents.send(channel, ...args);
    }
  }
}

export default IpcTransport;
