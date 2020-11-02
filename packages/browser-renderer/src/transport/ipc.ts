import { ipcRenderer } from '@renderer/preloaded/electron';

import { Transport } from '@renderer/transport/types';

/**
 * Init transport between main and renderer via Electron ipcRenderer.
 */
const transport = (): Transport => ({
  on: (channel, listener) => {
    ipcRenderer.on(channel, (_e: Electron.IpcRendererEvent, ...args) => {
      listener(...args);
    });
  },

  send: (channel, ...args) => {
    ipcRenderer.send(channel, ...args);
  },
});

export default transport;
