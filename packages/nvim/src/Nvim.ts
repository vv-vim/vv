import type { NvimTransport } from './types';

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

  private isRenderer: boolean;

  constructor(transport: NvimTransport, isRenderer = false) {
    this.transport = transport;
    this.isRenderer = isRenderer;

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

    this.transport.onClose(() => {
      this.handleNotification('close');
    });
  }

  request<R = void>(command: string, params: any[] = []): Promise<R> {
    this.requestId += 1;
    // Workaround to avoid request ids conflict vetween main and renderer. Renderer ids are even, main ids are odd.
    // TODO: sync request id between all instances.
    const id = this.requestId * 2 + (this.isRenderer ? 0 : 1);
    this.transport.write(id, `nvim_${command}`, params);
    return new Promise((resolve, reject) => {
      this.requestPromises[id] = {
        resolve,
        reject,
      };
    });
  }

  private handleNotification(command: string, params?: any[]) {
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
    if (method !== 'close') {
      this.subscribe(method);
    }

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

  eval = <Result = void>(command: string, params?: any[]): Promise<Result> =>
    this.request('eval', [command, params]);

  callFunction = <Result = void>(name: string, params: any[]): Promise<Result> =>
    this.request('call_function', [name, params]);

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
