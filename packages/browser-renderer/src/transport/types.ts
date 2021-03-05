import { NvimTransport } from 'src/Nvim';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Args = any[];

export type Listener = (...args: Args) => void;

/**
 * Transport between main and renderer.
 * This is WIP. Adding this abstraction on top of ipcRenderer to be able to switch to websockets or smth
 * for server mode.
 */
export type Transport = {
  /**
   * Receive message from main.
   */
  on: (channel: string, listener: Listener) => void;

  /**
   * Send message to main.
   */
  send: (channel: string, ...args: Args) => void;

  nvim: NvimTransport;
};
