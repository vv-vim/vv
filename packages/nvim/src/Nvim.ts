import { EventEmitter } from 'events';
import type { Transport, /* UiEventsArgs, */ MessageType } from './types';

/**
 * Lightweight transport agnostic Neovim API client to be used in other @vvim packages.
 */
class Nvim extends EventEmitter {
  private requestId = 0;

  private transport: Transport;

  private requestPromises: Record<
    string,
    { resolve: (result: any) => void; reject: (error: any) => void }
  > = {};

  private isRenderer: boolean;

  constructor(transport: Transport, isRenderer = false) {
    super();

    this.transport = transport;
    this.isRenderer = isRenderer;

    this.transport.on('nvim:data', (params: MessageType) => {
      if (params[0] === 0) {
        // eslint-disable-next-line no-console
        console.error('Unsupported request type', ...params);
      } else if (params[0] === 1) {
        this.handleResponse(params[1], params[2], params[3]);
      } else if (params[0] === 2) {
        this.emit(params[1], params[2]);
      }
    });

    this.transport.on('nvim:close', () => {
      this.emit('close');
    });

    this.on('newListener', (eventName: string) => {
      if (
        !this.listenerCount(eventName) &&
        !['close', 'newListener', 'removeListener'].includes(eventName) &&
        !eventName.startsWith('nvim:')
      ) {
        this.subscribe(eventName);
      }
    });

    this.on('removeListener', (eventName: string) => {
      if (
        !this.listenerCount(eventName) &&
        !['close', 'newListener', 'removeListener'].includes(eventName) &&
        !eventName.startsWith('nvim:')
      ) {
        this.unsubscribe(eventName);
      }
    });
  }

  request<R = void>(command: string, params: any[] = []): Promise<R> {
    this.requestId += 1;
    // Workaround to avoid request ids conflict vetween main and renderer. Renderer ids are even, main ids are odd.
    // TODO: sync request id between all instances.
    const id = this.requestId * 2 + (this.isRenderer ? 0 : 1);
    this.transport.send('nvim:write', id, `nvim_${command}`, params);
    return new Promise((resolve, reject) => {
      this.requestPromises[id] = {
        resolve,
        reject,
      };
    });
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

  // TODO: add types for specific events
  // on(method: 'redraw', callback: (args: UiEventsArgs) => void): void;
  // on(method: 'close', callback: () => void): void;

  private commandFactory = <R = void>(command: string) => (...params: any[]): Promise<R> =>
    this.request<R>(command, params);

  subscribe = this.commandFactory('subscribe');

  unsubscribe = this.commandFactory('unsubscribe');

  eval = <Result = void>(command: string): Promise<Result> => this.request('eval', [command]);

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
