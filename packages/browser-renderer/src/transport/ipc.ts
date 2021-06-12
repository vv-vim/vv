import { EventEmitter } from 'events';

import { ipcRenderer } from 'src/preloaded/electron';

import type { Transport, Args } from '@vvim/nvim';

const addListenerMethods = [
  'addListener',
  'on',
  'once',
  'prependListener',
  'prependOnceListener',
] as const;

/**
 * Init transport between main and renderer via Electron ipcRenderer.
 */
class IpcRendererTransport extends EventEmitter implements Transport {
  ipc: Electron.IpcRenderer;

  registeredEvents: Record<string, any> = {};

  constructor(ipc = ipcRenderer) {
    super();
    this.ipc = ipc;

    addListenerMethods.forEach((m) => this.patchAddListenerMethod(m));
  }

  private patchAddListenerMethod(methodName: typeof addListenerMethods[number]) {
    this[methodName] = (eventName: string, listener: (...args: Args) => void) => {
      if (!this.registeredEvents[eventName]) {
        this.registeredEvents[eventName] = (_e: Electron.IpcRendererEvent, ...args: Args) => {
          this.emit(eventName, ...args);
        };
        this.ipc.on(eventName, this.registeredEvents[eventName]);
      }
      return super[methodName](eventName, listener);
    };
  }

  send(channel: string, ...params: Args): void {
    this.ipc.send(channel, ...params);
  }
}

export default IpcRendererTransport;
