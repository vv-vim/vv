import { IpcRendererEvent } from 'electron';

import { ipcRenderer } from '@renderer/preloaded/electron';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Args = any[];

type Listener = (...args: Args) => void;

export type Transport = {
  on: (channel: string, listener: Listener) => void;
  send: (channel: string, ...args: Args) => void;
};

/**
 * Transport between main and renderer.
 * This is WIP. Adding this abstraction on top of ipcRenderer to be able to switch to websockets or smth
 * for server mode.
 */
const transport = (): Transport => ({
  /**
   * Receive message from main.
   */
  on: (channel, listener) => {
    ipcRenderer.on(channel, (_e: IpcRendererEvent, ...args) => {
      listener(...args);
    });
  },

  /**
   * Send message to main.
   */
  send: (channel, ...args) => {
    ipcRenderer.send(channel, ...args);
  },
});

export default transport;
