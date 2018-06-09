import { app, dialog, shell } from 'electron';
import { execSync } from 'child_process';

const checkNeovim = () => {
  try {
    execSync('which nvim');
  } catch (error) {
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
  }
};

export default checkNeovim;
