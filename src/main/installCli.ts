import { dialog } from 'electron';
import { execSync } from 'child_process';
import which from './lib/which';

const showInstallCliDialog = () =>
  dialog.showMessageBoxSync({
    message: 'Command line launcher',
    detail: `With command line launcher you can run VV from terminal:
$ vv [filename]

Do you wish to install it? It will be placed
to /usr/local/bin.
`,
    cancelId: 1,
    defaultId: 0,
    buttons: ['Install', 'Cancel'],
  });

const showCliInstalledDialog = (message: string, path: string) =>
  dialog.showMessageBox({
    message,
    detail: `Command line launcher installed at ${path}. You can run VV from terminal by typing:
$ vv [filename]
`,
    defaultId: 0,
    buttons: ['Ok'],
  });

const showErrorDialog = (error: Error) => {
  dialog.showMessageBox({
    message: 'Error',
    detail: error.message,
    defaultId: 0,
    buttons: ['Ok'],
  });
};

const installCli = (binPath: string) => () => {
  let path = which('vv');
  if (path && path.indexOf('VV.app/Contents/MacOS/vv') === -1) {
    path = path.replace('\n', '');
    showCliInstalledDialog('Command Line Launcher', path);
  } else {
    const response = showInstallCliDialog();
    if (response === 0) {
      try {
        execSync(`ln -sf ${binPath} /usr/local/bin/`);
      } catch (error) {
        showErrorDialog(error);
        return;
      }
      showCliInstalledDialog('Done', '/usr/local/bin/vv');
    }
  }
};

export default installCli;
