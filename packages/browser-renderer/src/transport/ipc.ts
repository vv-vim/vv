import { ipcRenderer } from 'src/preloaded/electron';

import { Transport } from 'src/transport/types';
import { MessageType } from 'src/Nvim';

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

  nvim: {
    write: (id: number, command: string, params: any[]) => {
      ipcRenderer.send('nvim-send', [id, command, params]);
    },

    read: (callback) => {
      ipcRenderer.on('nvim-data', (_e: Electron.IpcRendererEvent, args: MessageType) => {
        callback(args);
      });
    },
  },
});

export default transport;
