/**
 * Handle close window routine
 */

import { dialog, app, BrowserWindow } from 'electron';
import { deleteNvimByWindow } from 'src/main/nvim/nvimByWindow';

import type Nvim from '@vvim/nvim';

/**
 * If we want to quit app after closing window, shouldQuit is true.
 * This function is used in 'before-quit' event to switch to close app mode.
 */
let shouldQuit = false;

export const setShouldQuit = (newShouldQuit: boolean): void => {
  shouldQuit = newShouldQuit;
};

/**
 * Show Save All dialog if there are any unsaved buffers.
 * Cancel quit on cancel.
 */
const showCloseDialog = async ({ nvim, win }: { nvim: Nvim; win: BrowserWindow }) => {
  const unsavedBuffers = await nvim.callFunction<Array<{ name: string }>>('VVunsavedBuffers', []);
  if (unsavedBuffers.length === 0) {
    nvim.command('qa');
  } else {
    win.focus();
    const { response } = await dialog.showMessageBox(win, {
      message: `You have ${unsavedBuffers.length} unsaved buffers. Do you want to save them?`,
      detail: `${unsavedBuffers.map((b) => b.name).join('\n')}\n`,
      cancelId: 2,
      defaultId: 0,
      buttons: ['Save All', 'Discard All', 'Cancel'],
    });
    if (response === 0) {
      await nvim.command('xa'); // Save All
    } else if (response === 1) {
      await nvim.command('qa!'); // Discard All
    }
    setShouldQuit(false);
  }
};

const initQuit = ({ win, nvim }: { nvim: Nvim; win: BrowserWindow }): void => {
  let isConnected = true;

  // Close window if nvim process is closed.
  nvim.on('close', () => {
    // Disable fullscreen before close, otherwise it it will keep menu bar hidden after window
    // is closed.
    win.hide();
    win.setSimpleFullScreen(false);

    isConnected = false;
    deleteNvimByWindow(win);
    win.close();
  });

  // If nvim process is not closed, show Save All dialog.
  win.on('close', (e: Electron.Event) => {
    if (isConnected) {
      e.preventDefault();
      showCloseDialog({ win, nvim });
    }
  });

  // After window is closed, continue quit app if this is a part of quit app routine
  win.on('closed', () => {
    if (shouldQuit) {
      app.quit();
    }
  });
};

export default initQuit;
