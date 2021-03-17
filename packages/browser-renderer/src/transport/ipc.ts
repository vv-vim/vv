import { ipcRenderer } from 'src/preloaded/electron';

import { MessageType } from '@vvim/nvim';

import type { Transport } from 'src/transport/types';

/**
 * Init transport between main and renderer via Electron ipcRenderer.
 */
const transport = (): Transport => ({
  on: (channel, listener) => {
    ipcRenderer.on(channel, (_e: Electron.IpcRendererEvent, ...args) => {
      listener(...args);
    });
  },

  send: (channel, ...params) => {
    ipcRenderer.send(channel, ...params);
  },

  // TODO: Refactor to packages/browser-renderer/src/transport/transport.ts
  nvim: {
    write: (id: number, command: string, params: any[]) => {
      ipcRenderer.send('nvim-send', [id, command, params]);
    },

    read: (callback) => {
      ipcRenderer.on('nvim-data', (_e: Electron.IpcRendererEvent, args: MessageType) => {
        callback(args);
      });
    },

    onClose: (callback) => {
      ipcRenderer.on('nvim-close', () => callback());
    },
  },
});

export default transport;
