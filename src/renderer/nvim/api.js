import { spawn } from 'child_process';
import { createDecodeStream } from 'msgpack-lite/lib/decode-stream';
import { createEncodeStream } from 'msgpack-lite/lib/encode-stream';
import { encode } from 'msgpack-lite';

import path from 'path';
import debounce from 'lodash/debounce';

import nvimCommand from '../../lib/nvimCommand';
import shell from '../../lib/shell';

let proc;
let msgpackIn;
let msgpackOut;
let resourcesPath;

let requestId = 0;
const requestPromises = {};

const subscriptions = [];

const vvSourceCommand = () => `source ${path.join(resourcesPath, 'bin/vv.vim')}`;

const startNvimProcess = ({ cwd, args }) => {
  const nvimArgs = ['--embed', '--cmd', vvSourceCommand(), ...args];

  const nvimProcess = spawn(
    nvimCommand(),
    nvimArgs.map(arg => `'${arg.replace(/'/g, "'\\''")}'`), // Escaping is broken with shell
    { cwd, shell }, // exec through shell is required to have correct env variables (ex. PATH)
  );

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

const handleResponse = (id, error, result) => {
  if (requestPromises[id]) {
    if (error) {
      requestPromises[id].reject(error);
    } else {
      requestPromises[id].resolve(result);
    }
    requestPromises[id] = null;
  }
};

const send = (command, ...params) => {
  if (!msgpackOut) {
    throw new Error('Neovim is not initialized');
  }
  requestId += 1;
  msgpackOut.write(encode([0, requestId, `nvim_${command}`, params]));
  return new Promise((resolve, reject) => {
    requestPromises[requestId] = {
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
    proc.on('exit', callback);
  } else {
    send('subscribe', method);
    subscribe(filterMethod(method, callback));
  }
};

const commandFactory = (name) => (...params) => send(name, ...params)

const nvim = {
  command: commandFactory('command'),
  input: commandFactory('input'),
  getMode: commandFactory('get_mode'),
  uiTryResize: commandFactory('ui_try_resize'),
  uiAttach: commandFactory('ui_attach'),
}

// Source vv specific ext on -u NONE
const fixNoConfig = args => {
  const uFlagIndex = args.indexOf('-u');
  if (uFlagIndex !== -1 && args[uFlagIndex + 1] === 'NONE') {
    nvim.command(vvSourceCommand());
  }
};

const initApi = ({ args, cwd, resourcesPath: newResourcesPath }) => {
  resourcesPath = newResourcesPath;
  proc = startNvimProcess({ args, cwd });

  const decodeStream = createDecodeStream();
  const encodeStream = createEncodeStream();

  msgpackIn = proc.stdout.pipe(decodeStream); // .on('data', console.log);
  msgpackOut = encodeStream.pipe(proc.stdin);

  msgpackIn.on('data', ([type, ...params]) => {
    if (type === 0) { // TODO
      console.log('request', type, params);
    } else if (type === 1) {
      handleResponse(params[0], params[1], params[2]);
    } else if (type === 2) {
      subscriptions.forEach(c => c(params[0], params[1]));
    }
  });

  fixNoConfig(args);
};

export default {
  initApi,
  on,
  subscribe,
  send,
  ...nvim,
};
