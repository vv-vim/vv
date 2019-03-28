import { remote } from 'electron';

import nvim from '../api';

const currentWindow = remote.getCurrentWindow();

let changedBuffers = {};
let enabled = true;
let checking = false;

const showChangedDialog = async () => {
  if (currentWindow.isFocused() && Object.keys(changedBuffers).length > 0) {
    const message =
      Object.keys(changedBuffers).length > 1
        ? `${
            Object.keys(changedBuffers).length
          } opened files were changed outside. Do you want to reload them or keep your version?`
        : 'File was changed outside. Do you want to reload it or keep your version?';

    const buttons =
      Object.keys(changedBuffers).length > 1 ? ['Reload All', 'Keep All'] : ['Reload', 'Keep'];

    const response = remote.dialog.showMessageBox(currentWindow, {
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

const initReloadChanged = () => {
  nvim.on('vv:file_changed', (args) => {
    if (enabled) {
      const [buffer] = args;
      if (!changedBuffers[buffer.bufnr]) {
        changedBuffers[buffer.bufnr] = buffer;
      }
      if (!checking) {
        checktimeAll();
      }
    }
  });

  nvim.on('vv:set', ([option, isEnabled]) => {
    if (option === 'reloadchanged') {
      enable(isEnabled);
    }
  });

  currentWindow.on('focus', () => {
    if (enabled) {
      checktimeAll();
    }
  });

  enable();
};

export default initReloadChanged;
