import { EventEmitter } from 'events';
import { memoize } from 'lodash';

import { ipcRenderer } from 'src/preloaded/electron';
import type { PreloadedIpcRenderer } from 'src/preloaded/electron';

import type { Transport, Args } from '@vvim/nvim';

/**
 * Init transport between main and renderer via Electron ipcRenderer.
 */
class IpcRendererTransport extends EventEmitter implements Transport {
  private ipc: PreloadedIpcRenderer;

  constructor(ipc = ipcRenderer) {
    super();

    this.ipc = ipc;

    this.on('newListener', (eventName: string) => {
      if (
        !this.listenerCount(eventName) &&
        !['newListener', 'removeListener'].includes(eventName)
      ) {
        this.ipc.on(eventName, this.handleEvent(eventName));
      }
    });

    this.on('removeListener', (eventName: string) => {
      if (
        !this.listenerCount(eventName) &&
        !['newListener', 'removeListener'].includes(eventName)
      ) {
        this.ipc.removeListener(eventName, this.handleEvent(eventName));
      }
    });
  }

  handleEvent = memoize((eventName: string) => (...args: Args): void => {
    this.emit(eventName, ...args);
  });

  send(channel: string, ...params: Args): void {
    this.ipc.send(channel, ...params);
  }
}

export default IpcRendererTransport;
