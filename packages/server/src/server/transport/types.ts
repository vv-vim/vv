// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Args = any[];

export type Listener = (...args: Args) => void;

/**
 * Transport between server and renderer.
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
