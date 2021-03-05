// TODO: TS is a mess here, fix it.

import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import path from 'path';

import { createEncodeStream, createDecodeStream, encode, DecodeStream } from 'msgpack-lite';

import debounce from 'lodash/debounce';

import isDev from 'src/lib/isDev';

import shellEnv from 'src/main/lib/shellEnv';
import nvimCommand from 'src/main/lib/nvimCommand';

export type NvimCommand<R extends any> = (...args: any[]) => Promise<R>;

export type Nvim = {
  on: (method: string, callback: (...p: any[]) => void) => void;
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

const vvSourceCommand = (appPath?: string) =>
  appPath ? `source ${path.join(appPath, isDev('./', '../'), 'bin/vv.vim')}` : 'source bin/vv.vim';

const startNvimProcess = ({
  args = [],
  cwd,
  appPath,
}: {
  args?: string[];
  cwd?: string;
  appPath?: string;
}) => {
  const env = shellEnv();

  const nvimArgs = ['--embed', '--cmd', vvSourceCommand(appPath), ...args];

  const nvimProcess = spawn(nvimCommand(env), nvimArgs, { cwd, env });

  // Pipe errors to std output and also send it in console as error.
  let errorStr = '';
  nvimProcess.stderr.pipe(process.stdout);
  nvimProcess.stderr.on('data', (data) => {
    errorStr += data.toString();
    debounce(() => {
      if (errorStr) console.error(errorStr); // eslint-disable-line no-console
      errorStr = '';
    }, 10)();
  });

  // nvimProcess.stdout.on('data', (data) => {
  //   console.log(data.toString());
  // });

  return nvimProcess;
};

const api = ({
  args = [],
  cwd,
  appPath,
}: {
  args?: string[];
  cwd?: string;
  appPath?: string;
}): Nvim => {
  let proc: ChildProcessWithoutNullStreams;
  let msgpackIn: DecodeStream;
  let msgpackOut: NodeJS.WritableStream;

  let requestId = 0;
  const requestPromises: Record<
    string,
    { resolve: (result: any) => void; reject: (error: any) => void }
  > = {};

  let subscriptions: [string, (...a: any[]) => void][] = [];

  const send = (customId: number | null, command: string, params: any[]) => {
    if (!msgpackOut) {
      throw new Error('Neovim is not initialized');
    }
    const id = customId || (requestId += 1) * 2;
    msgpackOut.write(encode([0, id, `nvim_${command}`, params]));
    return new Promise((resolve, reject) => {
      requestPromises[id] = {
        resolve,
        reject,
      };
    });
  };

  const commandFactory = (name: string) => (...params: any[]) => send(null, name, params);

  const nvim: Partial<Nvim> = {
    eval: commandFactory('eval'),
    callFunction: commandFactory('call_function'),
    command: commandFactory('command'),
    input: commandFactory('input'),
    inputMouse: commandFactory('input_mouse'),
    // @ts-expect-error
    getMode: commandFactory('get_mode'),
    uiTryResize: commandFactory('ui_try_resize'),
    uiAttach: commandFactory('ui_attach'),
    subscribe: commandFactory('subscribe'),
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

  const on = (method: string, callback: () => void) => {
    if (method === 'disconnect') {
      proc.on('close', callback);
    } else if (method === 'data') {
      msgpackIn.on('data', callback);
    } else {
      (nvim as Nvim).subscribe(method);
      subscriptions.push([method, callback]);
    }
  };

  const off = (method: string, callback: () => void) => {
    subscriptions = subscriptions.filter(([m, c]) => !(method === m && callback === c));
  };

  proc = startNvimProcess({ args, cwd, appPath });

  const decodeStream = createDecodeStream();
  const encodeStream = createEncodeStream();

  msgpackIn = proc.stdout.pipe(decodeStream);
  msgpackOut = encodeStream.pipe(proc.stdin);

  // https://github.com/msgpack-rpc/msgpack-rpc/blob/master/spec.md
  msgpackIn.on('data', ([type, ...rest]) => {
    if (type === 1) {
      // Receive response for previous request with id
      const [id, error, result] = rest;
      if (requestPromises[id]) {
        if (error) {
          requestPromises[id].reject(error);
        } else {
          requestPromises[id].resolve(result);
        }
        delete requestPromises[id];
      }
    } else if (type === 2) {
      // Receive notification
      const [method, params] = rest;
      subscriptions.forEach(([m, c]) => {
        if (m === method) {
          c(params);
        }
      });
    }
  });

  // Source vv specific ext on -u NONE
  const uFlagIndex = args.indexOf('-u');
  if (uFlagIndex !== -1 && args[uFlagIndex + 1] === 'NONE') {
    (nvim as Nvim).command(vvSourceCommand(appPath));
  }

  return {
    on,
    off,
    send,
    ...nvim,
  } as Nvim;
};

export default api;
