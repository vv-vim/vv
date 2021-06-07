import { dialog, BrowserWindow } from 'electron';

import type Nvim from '@vvim/nvim';

/**
 * Show "Reload changed" dialog when opened files changed ouside (ex. switch git branch).
 */
const initReloadChanged = ({ nvim, win }: { nvim: Nvim; win: BrowserWindow }): void => {
  type Buffer = {
    bufnr: string;
    name: string;
  };

  let changedBuffers: Record<string, Buffer> = {};
  let enabled = false;
  let checking = false;

  const showChangedDialog = async () => {
    if (win.isFocused() && Object.keys(changedBuffers).length > 0) {
      const message =
        Object.keys(changedBuffers).length > 1
          ? `${
              Object.keys(changedBuffers).length
            } opened files were changed outside. Do you want to reload them or keep your version?`
          : 'File was changed outside. Do you want to reload it or keep your version?';

      const buttons =
        Object.keys(changedBuffers).length > 1 ? ['Reload All', 'Keep All'] : ['Reload', 'Keep'];

      const { response } = await dialog.showMessageBox(win, {
        message,
        detail: `${Object.keys(changedBuffers)
          .map((k) => changedBuffers[k].name)
          .join('\n')}\n`,
        cancelId: 1,
        defaultId: 0,
        buttons,
      });
      if (response === 0) {
        nvim.callFunction(
          'VVrefresh',
          Object.keys(changedBuffers).map((k) => changedBuffers[k].bufnr),
        );
        changedBuffers = {};
      }
    }
  };

  const checktime = async () => {
    if (!checking) {
      checking = true;
      await nvim.command('checktime');
      checking = false;
      showChangedDialog();
    }
  };

  const enable = (newEnabled = true) => {
    if (enabled !== !!newEnabled) {
      enabled = !!newEnabled;
      nvim.callFunction('VVenableReloadChanged', [enabled ? 1 : 0]);
    }
  };

  nvim.on<[Buffer]>('vv:file_changed', ([buffer]) => {
    if (enabled) {
      if (!changedBuffers[buffer.bufnr]) {
        changedBuffers[buffer.bufnr] = buffer;
      }
      checktime();
    }
  });

  nvim.on<[string, boolean]>('vv:set', ([option, isEnabled]) => {
    if (option === 'reloadchanged') {
      enable(isEnabled);
    }
  });

  win.on('focus', () => {
    if (enabled) {
      // The page will be blank on focus without timeout.
      setTimeout(() => checktime(), 10);
    }
  });
};

export default initReloadChanged;
