import debounce from 'lodash/debounce';

const {
  remote: { getCurrentWindow, dialog },
} = global.require('electron');

let nvim;
const currentWindow = getCurrentWindow();
let changedBuffers = {};
let enabled = true;

const showChangedDialog = async () => {
  if (currentWindow.isFocused()) {
    const message =
      Object.keys(changedBuffers).length > 1
        ? `${
          Object.keys(changedBuffers).length
        } opened files were changed outside. Do you want to reload them or keep your version?`
        : 'File was changed outside. Do you want to reload it or keep your version?';

    const buttons =
      Object.keys(changedBuffers).length > 1
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
      nvim.command(`VVrefresh ${Object.keys(changedBuffers)
        .map(k => changedBuffers[k].bufnr)
        .join(' ')}`);
      changedBuffers = {};
    }
  }
};

const debouncedShowChangeDialog = debounce(showChangedDialog, 100);

const checktimeAll = () => {
  nvim.command('VVchecktimeAll');
};

const debouncedChecktimeAll = debounce(checktimeAll, 50);

const enable = (enabled = true) => {
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
        // If we detect changed outside buffer, iterate on other changed buffers and check them too
        // Debounced in 50 ms to avoid multiple calls
        debouncedChecktimeAll();
        // Show dialog debounced in 100 ms to make checktimeAll calls finished
        debouncedShowChangeDialog();
      }
      if (method === 'vv:set') {
        const [option, ...props] = args;
        if (option === 'reloadchanged') {
          enable(props[0]);
        }
      }
    });

    currentWindow.on('focus', () => {
      if (enabled) nvim.command('VVchecktimeAll');
    });

    nvim.subscribe('vv:file_changed');
  }
  enable();
};

export default initReloadChanged;
