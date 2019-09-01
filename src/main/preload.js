const { remote, ipcRenderer } = require('electron');

window.electron = {
  ipcRenderer,
  remote,
};
