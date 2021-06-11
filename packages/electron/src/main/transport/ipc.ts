import { ipcMain } from 'electron';
import { EventEmitter } from 'events';

import { Transport, Args } from '@vvim/nvim';

const addListenerMethods = [
  'addListener',
  'on',
  'once',
  'prependListener',
  'prependOnceListener',
] as const;

/**
 * Init transport between main and renderer to be used for main side.
 */
class IpcTransport extends EventEmitter implements Transport {
  win: Electron.BrowserWindow;

  registeredEvents: Record<string, any> = {};

  closed = false;

  ipc: Electron.IpcMain;

  constructor(win: Electron.BrowserWindow, ipc = ipcMain) {
    super();

    this.win = win;

    this.ipc = ipc;

    win.on('closed', () => {
      this.closed = true;
    });

    addListenerMethods.forEach((m) => this.patchAddListenerMethod(m));
  }

  private patchAddListenerMethod(methodName: typeof addListenerMethods[number]) {
    this[methodName] = (eventName: string, listener: (...args: any[]) => void) => {
      this.registerEvent(eventName);
      return super[methodName](eventName, listener);
    };
  }

  private registerEvent(eventName: string) {
    if (!this.registeredEvents[eventName]) {
      this.registeredEvents[eventName] = (
        { sender: { id } }: Electron.IpcMainEvent,
        ...args: Args
      ) => {
        if (id === this.win.id) {
          this.emit(eventName, ...args);
        }
      };
      this.ipc.on(eventName, this.registeredEvents[eventName]);
      this.win.on('closed', () => {
        this.ipc.removeListener(eventName, this.registeredEvents[eventName]);
      });
    }
  }

  send(channel: string, ...args: any[]): void {
    if (!this.closed) {
      this.win.webContents.send(channel, ...args);
    }
  }
}

export default IpcTransport;
