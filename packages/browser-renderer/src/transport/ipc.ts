import { EventEmitter } from 'events';

import { ipcRenderer } from 'src/preloaded/electron';

import type { Transport, Args } from '@vvim/nvim';

/**
 * Init transport between main and renderer via Electron ipcRenderer.
 */
class IpcRendererTransport extends EventEmitter implements Transport {
  private ipc: Electron.IpcRenderer;

  constructor(ipc: Electron.IpcRenderer = ipcRenderer) {
    super();
    this.ipc = ipc;

    this.on('newListener', (eventName: string) => {
      if (
        !this.listenerCount(eventName) &&
        !['newListener', 'removeListener'].includes(eventName)
      ) {
        this.ipc.on(eventName, this.handleEvent);
      }
    });

    this.on('removeListener', (eventName: string) => {
      if (
        !this.listenerCount(eventName) &&
        !['newListener', 'removeListener'].includes(eventName)
      ) {
        this.ipc.removeListener(eventName, this.handleEvent);
      }
    });
  }

  handleEvent = (e: Electron.IpcRendererEvent, ...args: Args): void => {
    this.emit(e.type, ...args);
  };

  send(channel: string, ...params: Args): void {
    this.ipc.send(channel, ...params);
  }
}

export default IpcRendererTransport;
