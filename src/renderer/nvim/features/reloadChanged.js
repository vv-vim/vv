const { remote: { getCurrentWindow, dialog } } = global.require('electron');

let nvim;
const currentWindow = getCurrentWindow();
let changedBuffers = {};
let enabled = true;
let checking = false;

const showChangedDialog = async () => {
  if (currentWindow.isFocused() && Object.keys(changedBuffers).length > 0) {
    const message = Object.keys(changedBuffers).length > 1
      ? `${
        Object.keys(changedBuffers).length
      } opened files were changed outside. Do you want to reload them or keep your version?`
      : 'File was changed outside. Do you want to reload it or keep your version?';

    const buttons = Object.keys(changedBuffers).length > 1
      ? ['Reload All', 'Keep All']
      : ['Reload', 'Keep'];

    const response = dialog.showMessageBox(currentWindow, {
      message,
      detail: `${Object.keys(changedBuffers)
        .map(k => changedBuffers[k].name)
        .join('\n')}\n`,
      cancelId: 1,
      defaultId: 0,
      buttons,
    });
    if (response === 0) {
      nvim.command(
        `VVrefresh ${Object.keys(changedBuffers)
          .map(k => changedBuffers[k].bufnr)
          .join(' ')}`,
      );
      changedBuffers = {};
    }
  }
};

const checktimeAll = async () => {
  checking = true;
  await nvim.command('VVchecktimeAll');
  checking = false;
  showChangedDialog();
};

const enable = (newEnabled = true) => {
  enabled = newEnabled;
  nvim.command(`VVenableReloadChanged ${enabled ? '1' : '0'}`);
};

const initReloadChanged = (newNvim) => {
  if (!nvim) {
    nvim = newNvim;

    nvim.on('notification', (method, args) => {
      if (enabled && method === 'vv:file_changed') {
        const [buffer] = args;
        if (!changedBuffers[buffer.bufnr]) {
          changedBuffers[buffer.bufnr] = buffer;
        }
        if (!checking) {
          checktimeAll();
        }
      }
      if (method === 'vv:set') {
        const [option, ...props] = args;
        if (option === 'reloadchanged') {
          enable(props[0]);
        }
      }
    });

    currentWindow.on('focus', () => {
      if (enabled) {
        checktimeAll();
      }
    });

    nvim.subscribe('vv:file_changed');
  }
  enable();
};

export default initReloadChanged;
