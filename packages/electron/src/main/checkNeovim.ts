import { app, dialog, shell } from 'electron';
import semver from 'semver';

import { nvimVersion } from '@vvim/nvim';

const REQUIRED_VERSION = '0.4.0';

const checkNeovim = (): void => {
  const version = nvimVersion();
  if (!version) {
    const result = dialog.showMessageBoxSync({
      message: 'Neovim is not installed',
      detail: `VV requires Neovim. You can install it via Homebrew:
brew install neovim

Or you can find Neovim installation instructions here:
https://github.com/neovim/neovim/wiki/Installing-Neovim
  `,
      defaultId: 0,
      buttons: ['Open Installation Instructions', 'Close'],
    });
    if (result === 0) {
      shell.openExternal('https://github.com/neovim/neovim/wiki/Installing-Neovim');
    }
    app.exit();
  } else if (semver.lt(version, REQUIRED_VERSION)) {
    const result = dialog.showMessageBoxSync({
      message: 'Neovim is outdated',
      detail: `VV requires Neovim version ${REQUIRED_VERSION} and later.
You have ${version}.

If you installed Neovim via Homebrew, please run:
brew upgrade neovim

Otherwise please check installation instructions here:
https://github.com/neovim/neovim/wiki/Installing-Neovim
  `,
      defaultId: 0,
      buttons: ['Open Installation Instructions', 'Close'],
    });
    if (result === 0) {
      shell.openExternal('https://github.com/neovim/neovim/wiki/Installing-Neovim');
    }
    app.exit();
  }
};

export default checkNeovim;
