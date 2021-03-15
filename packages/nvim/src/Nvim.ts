// TODO: Refactor to use same API for main and renderer.

type RequestMessage = [0, number, string, any[]];
type ResponseMessage = [1, number, any, any];
type NotificationMessage = [2, string, any[]];

export type MessageType = RequestMessage | ResponseMessage | NotificationMessage;

export type NvimTransport = {
  /**
   *
   */
  write: (id: number, command: string, params: any[]) => void;

  /**
   *
   */
  read: (callback: (message: MessageType) => void) => void;
};

/**
 * Lightweight transport agnostic Neovim API client to be used in other @vvim packages.
 */
class Nvim {
  private requestId = 0;

  private transport: NvimTransport;

  private subscriptions: Record<string, Array<(...params: any[]) => void>> = {};

  private requestPromises: Record<
    string,
    { resolve: (result: any) => void; reject: (error: any) => void }
  > = {};

  constructor(transport: NvimTransport) {
    this.transport = transport;

    this.transport.read((params) => {
      if (params[0] === 0) {
        // eslint-disable-next-line no-console
        console.error('Unsupported request type', ...params);
      } else if (params[0] === 1) {
        this.handleResponse(params[1], params[2], params[3]);
      } else if (params[0] === 2) {
        this.handleNotification(params[1], params[2]);
      }
    });
  }

  request<R = void>(command: string, params: any[] = []): Promise<R> {
    this.requestId += 1;
    const id = this.requestId * 2 + 1; // Request id for renderer is always odd
    this.transport.write(id, command, params);
    return new Promise((resolve, reject) => {
      this.requestPromises[id] = {
        resolve,
        reject,
      };
    });
  }

  private handleNotification(command: string, params: any[]) {
    if (this.subscriptions[command]) {
      this.subscriptions[command].forEach((c) => c(params));
    }
  }

  private handleResponse(id: number, error: Error, result?: any): void {
    if (this.requestPromises[id]) {
      if (error) {
        this.requestPromises[id].reject(error);
      } else {
        this.requestPromises[id].resolve(result);
      }
      delete this.requestPromises[id];
    }
  }

  on(method: string, callback: (...p: any[]) => void): void {
    this.subscribe(method);

    if (!this.subscriptions[method]) {
      this.subscriptions[method] = [];
    }
    this.subscriptions[method].push(callback);
  }

  // eslint-disable-next-line
  off(_method: string, _callback: () => void) {
    // TODO: implement
  }

  private commandFactory = <R = void>(command: string) => (...params: any[]): Promise<R> =>
    this.request<R>(command, params);

  subscribe = this.commandFactory('subscribe');

  eval = this.commandFactory('eval');

  callFunction = this.commandFactory('call_function');

  command = this.commandFactory('command');

  input = this.commandFactory('input');

  inputMouse = this.commandFactory('input_mouse');

  getMode = this.commandFactory<{ mode: string }>('get_mode');

  uiTryResize = this.commandFactory('ui_try_resize');

  uiAttach = this.commandFactory('ui_attach');

  getHlByName = this.commandFactory('get_hl_by_name');

  paste = this.commandFactory('paste');

  /**
   * Fetch current mode from nvim, leaves only first letter to match groups of modes.
   * https://neovim.io/doc/user/eval.html#mode()
   */
  getShortMode = async (): Promise<string> => {
    const { mode } = await this.getMode();
    return mode.replace('CTRL-', '')[0];
  };
}

export default Nvim;
