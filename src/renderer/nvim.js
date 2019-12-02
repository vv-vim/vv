import { ipcRenderer } from './preloaded/electron';

let requestId = 0;
const requestPromises = {};
const subscriptions = [];

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
  requestId += 1;
  const id = requestId * 2 + 1; // Request id for renderer is always odd
  ipcRenderer.send('nvim-send', [id, command, ...params]);
  return new Promise((resolve, reject) => {
    requestPromises[id] = {
      resolve,
      reject,
    };
  });
};

const subscribe = s => subscriptions.push(s);

const filterMethod = (methodToFilter, callback) => (method, ...params) => {
  if (method === methodToFilter) {
    callback(...params);
  }
};

const on = (method, callback) => {
  send('subscribe', method);
  subscribe(filterMethod(method, callback));
};

const commandFactory = name => (...params) => send(name, ...params);

const nvim = {
  eval: commandFactory('eval'),
  callFunction: commandFactory('call_function'),
  command: commandFactory('command'),
  input: commandFactory('input'),
  inputMouse: commandFactory('input_mouse'),
  getMode: commandFactory('get_mode'),
  uiTryResize: commandFactory('ui_try_resize'),
  uiAttach: commandFactory('ui_attach'),
};

export const initNvim = () =>
  ipcRenderer.on('nvim-data', (_e, [type, ...params]) => {
    if (type === 1) {
      handleResponse(params[0], params[1], params[2]);
    } else if (type === 2) {
      subscriptions.forEach(c => c(params[0], params[1]));
    }
  });

export default {
  on,
  subscribe,
  send,
  ...nvim,
};
