export interface PreloadedIpcRenderer {
  /**
   * Listens to `channel`, when a new message arrives `listener` would be called with
   * `listener(args...)`.
   */
  on(channel: string, listener: (...args: any[]) => void): this;
  /**
   * Adds a one time `listener` function for the event. This `listener` is invoked
   * only the next time a message is sent to `channel`, after which it is removed.
   */
  removeListener(channel: string, listener: (...args: any[]) => void): this;
  /**
   * Send an asynchronous message to the main process via `channel`, along with
   * arguments. Arguments will be serialized with the Structured Clone Algorithm,
   * just like `window.postMessage`, so prototype chains will not be included.
   * Sending Functions, Promises, Symbols, WeakMaps, or WeakSets will throw an
   * exception.
   *
   * > **NOTE**: Sending non-standard JavaScript types such as DOM objects or special
   * Electron objects is deprecated, and will begin throwing an exception starting
   * with Electron 9.
   *
   * The main process handles it by listening for `channel` with the `ipcMain`
   * module.
   */
  send(channel: string, ...args: any[]): void;
}

declare global {
  interface Window {
    electron: {
      ipcRenderer: PreloadedIpcRenderer;
    };
  }
}

export const { ipcRenderer } = window.electron || {};
