// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Args = any[];

export type Listener = (...args: Args) => void;

/**
 * Transport between main and renderer.
 * This is WIP. Adding this abstraction on top of ipcMain to be able to switch to websockets or smth
 * for server mode.
 */
export type Transport = {
  /**
   * Receive message from renderer.
   */
  on: (channel: string, listener: Listener) => void;

  /**
   * Send message to renderer.
   */
  send: (channel: string, ...args: Args) => void;
};
