import { EventEmitter } from 'events';

import { nvimCommandNames } from 'src/__generated__/constants';

import type { Transport, MessageType, NvimInterface } from './types';

const NvimEventEmitter = (EventEmitter as unknown) as { new (): NvimInterface };

/**
 * Lightweight transport agnostic Neovim API client to be used in other @vvim packages.
 */
class Nvim extends NvimEventEmitter {
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

    (Object.keys(nvimCommandNames) as Array<keyof typeof nvimCommandNames>).forEach(
      (commandName) => {
        (this as any)[commandName] = (...params: any[]) =>
          this.request(nvimCommandNames[commandName], params);
      },
    );

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
    this.transport.send('nvim:write', id, command, params);
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
