import { app, dialog, shell } from 'electron';
import nvimVersion from '../lib/nvimVersion';

const checkNeovim = () => {
  const version = nvimVersion();
  if (!version) {
    const result = dialog.showMessageBox({
      message: 'Neovim is not installed',
      detail: `VV requires Neovim. You can find Neovim installation instructions here:
https://github.com/neovim/neovim/wiki/Installing-Neovim
  `,
      defaultId: 0,
      buttons: ['Open Installation Instructions', 'Close'],
    });
    if (result === 0) {
      shell.openExternal('https://github.com/neovim/neovim/wiki/Installing-Neovim');
    }
    app.exit();
  } else if (version.num < 3001) {
    const result = dialog.showMessageBox({
      message: 'Neovim is outdated',
      detail: `VV requires Neovim version 0.3.1 and later. You have ${version[0]}.${version[1]}.${version[2]}.
You can run \`brew upgrade neovim\` if you used Homebrew to install it. Otherwise please check installation instructions here:
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
