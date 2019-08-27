import { app } from 'electron';

import { spawn } from 'child_process';
import path from 'path';

import { createDecodeStream } from 'msgpack-lite/lib/decode-stream';
import { createEncodeStream } from 'msgpack-lite/lib/encode-stream';
import { encode } from 'msgpack-lite';

import debounce from 'lodash/debounce';

import shellEnv from '../../lib/shellEnv';
import nvimCommand from '../../lib/nvimCommand';
import isDev from '../../lib/isDev';

const vvSourceCommand = () =>
  `source ${path.join(app.getAppPath(), isDev('./', '../'), 'bin/vv.vim')}`;

const startNvimProcess = ({ args, cwd }) => {
  const env = shellEnv();

  const nvimArgs = ['--embed', '--cmd', vvSourceCommand(), ...args];

  const nvimProcess = spawn(nvimCommand(env), nvimArgs, { cwd, env });

  // Pipe errors to std output and also send it in console as error.
  let errorStr = '';
  nvimProcess.stderr.pipe(process.stdout);
  nvimProcess.stderr.on('data', data => {
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

const api = ({ args, cwd }) => {
  let proc;
  let msgpackIn;
  let msgpackOut;

  let requestId = 0;
  const requestPromises = {};

  const subscriptions = [];

  const send = (customId, command, ...params) => {
    if (!msgpackOut) {
      throw new Error('Neovim is not initialized');
    }
    let id = customId;
    if (!id) {
      requestId += 1;
      id = requestId * 2; // Request id for main is always even
    }
    msgpackOut.write(encode([0, id, `nvim_${command}`, params]));
    return new Promise((resolve, reject) => {
      requestPromises[id] = {
        resolve,
        reject,
      };
    });
  };

  const subscribe = callback => {
    if (!msgpackIn) {
      throw new Error('Neovim is not initialized');
    }
    subscriptions.push(callback);
  };

  const filterMethod = (methodToFilter, callback) => (method, ...params) => {
    if (method === methodToFilter) {
      callback(...params);
    }
  };

  const on = (method, callback) => {
    if (method === 'disconnect') {
      proc.on('close', callback);
    } else if (method === 'data') {
      msgpackIn.on('data', callback);
    } else {
      send(null, 'subscribe', method);
      subscribe(filterMethod(method, callback));
    }
  };

  const commandFactory = name => (...params) => send(null, name, ...params);

  const nvim = {
    callFunction: commandFactory('call_function'),
    command: commandFactory('command'),
    input: commandFactory('input'),
    getMode: commandFactory('get_mode'),
    uiTryResize: commandFactory('ui_try_resize'),
    uiAttach: commandFactory('ui_attach'),
  };

  // Fetch current mode from nvim, leaves only first letter to match groups of modes.
  // https://neovim.io/doc/user/eval.html#mode()
  const getShortMode = async () => {
    const { mode } = await nvim.getMode();
    return mode.replace('CTRL-', '')[0];
  };

  proc = startNvimProcess({ args, cwd });

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
        requestPromises[id] = null;
      }
    } else if (type === 2) {
      // Receive notification
      const [method, params] = rest;
      subscriptions.forEach(c => c(method, params));
    }
  });

  // Source vv specific ext on -u NONE
  const uFlagIndex = args.indexOf('-u');
  if (uFlagIndex !== -1 && args[uFlagIndex + 1] === 'NONE') {
    nvim.command(vvSourceCommand());
  }

  return {
    on,
    subscribe,
    send,
    getShortMode,
    ...nvim,
  };
};

export default api;
