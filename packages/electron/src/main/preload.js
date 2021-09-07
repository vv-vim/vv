const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel, ...params) => {
      ipcRenderer.send(channel, ...params);
    },
    on: (channel, callback) => {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    },
    removeListener: ipcRenderer.removeListener,
  },
});
