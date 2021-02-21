// TODO: Refactor to use same API for main and renderer.

import { Transport } from '@renderer/transport/types';

export type NvimCommand<R extends any> = (...args: any[]) => Promise<R>;

export type Nvim = {
  on: (method: string, callback: (args: Array<[string, any[]]>) => void) => void;
  off: (method: string, callback: () => void) => void;
  send: (customId: number | null, command: string, ...params: any[]) => Promise<any>;

  eval: NvimCommand<any>;
  callFunction: NvimCommand<any>;
  command: NvimCommand<any>;
  input: NvimCommand<any>;
  inputMouse: NvimCommand<any>;
  getMode: NvimCommand<{ mode: string }>;
  uiTryResize: NvimCommand<any>;
  uiAttach: NvimCommand<any>;
  subscribe: NvimCommand<any>;
  getHlByName: NvimCommand<any>;
  paste: NvimCommand<any>;

  getShortMode: () => Promise<string>;
};

let transport: Transport;

let requestId = 0;
const requestPromises: Record<
  string,
  { resolve: (result: any) => void; reject: (error: any) => void }
> = {};

const subscriptions: Array<(command: string, ...p: any[]) => void> = [];

const handleResponse = (id: string, error: Error, result: any) => {
  if (requestPromises[id]) {
    if (error) {
      requestPromises[id].reject(error);
    } else {
      requestPromises[id].resolve(result);
    }
    // @ts-ignore FIXME
    requestPromises[id] = null;
  }
};

const send = (command: string, ...params: any[]) => {
  requestId += 1;
  const id = requestId * 2 + 1; // Request id for renderer is always odd
  transport.send('nvim-send', [id, command, ...params]);
  return new Promise((resolve, reject) => {
    requestPromises[id] = {
      resolve,
      reject,
    };
  });
};

const subscribe = (s: (...p: any[]) => void) => subscriptions.push(s);

const filterMethod = (methodToFilter: string, callback: (...p: any[]) => void) => (
  method: string,
  ...params: any[]
) => {
  if (method === methodToFilter) {
    callback(...params);
  }
};

const on = (method: string, callback: (...p: any[]) => void) => {
  send('subscribe', method);
  subscribe(filterMethod(method, callback));
};

const off = (_method: string, _callback: () => void) => {
  // TODO: implement
};

const commandFactory = (command: string) => (...params: any[]) => send(command, ...params);

const nvim: Partial<Nvim> = {
  eval: commandFactory('eval'),
  callFunction: commandFactory('call_function'),
  command: commandFactory('command'),
  input: commandFactory('input'),
  inputMouse: commandFactory('input_mouse'),
  // @ts-ignore FIXME
  getMode: commandFactory('get_mode'),
  uiTryResize: commandFactory('ui_try_resize'),
  uiAttach: commandFactory('ui_attach'),
  getHlByName: commandFactory('get_hl_by_name'),
  paste: commandFactory('paste'),
  /**
   * Fetch current mode from nvim, leaves only first letter to match groups of modes.
   * https://neovim.io/doc/user/eval.html#mode()
   */
  getShortMode: async () => {
    const { mode } = await (nvim as Nvim).getMode();
    return mode.replace('CTRL-', '')[0];
  },
};

export const initNvim = (newTransport: Transport): Nvim => {
  transport = newTransport;
  transport.on('nvim-data', ([type, ...params]) => {
    if (type === 1) {
      handleResponse(params[0], params[1], params[2]);
    } else if (type === 2) {
      subscriptions.forEach((c) => c(params[0], params[1]));
    }
  });
  return {
    on,
    off,
    subscribe,
    send,
    ...nvim,
  } as Nvim;
};

export default {
  on,
  off,
  subscribe,
  send,
  ...nvim,
} as Nvim;
