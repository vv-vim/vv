import { remote, ipcRenderer } from 'electron';

import nvim from '../api';

const currentWindow = remote.getCurrentWindow();

let unsavedBuffers = [];
let shouldClose = false;

const showCloseDialog = async () => {
  await nvim.command('VVunsavedBuffers');
  if (unsavedBuffers.length === 0) {
    nvim.command('qa');
  } else {
    const response = remote.dialog.showMessageBox(currentWindow, {
      message: `You have ${unsavedBuffers.length} unsaved buffers. Do you want to save them?`,
      detail: `${unsavedBuffers.map(b => b.name).join('\n')}\n`,
      cancelId: 2,
      defaultId: 0,
      buttons: ['Save All', 'Discard All', 'Cancel'],
    });
    if (response === 0) {
      await nvim.command('xa'); // Save All
    } else if (response === 1) {
      await nvim.command('qa!'); // Discard All
    }
    await nvim.command('VVunsavedBuffers');
    if (unsavedBuffers.length !== 0) {
      ipcRenderer.send('cancel-quit');
    }
  }
};

const handleClose = e => {
  if (!shouldClose) {
    showCloseDialog();
    e.returnValue = false;
  }
};

const handleDisconnect = async () => {
  await currentWindow.hide();
  await currentWindow.setSimpleFullScreen(false);
  unsavedBuffers = [];
  shouldClose = true;
  currentWindow.close();
};

const initQuit = () => {
  nvim.on('vv:unsaved_buffers', args => {
    [unsavedBuffers] = args;
  });

  nvim.on('disconnect', handleDisconnect);
  ipcRenderer.on('quit', handleClose);
};

export default initQuit;
