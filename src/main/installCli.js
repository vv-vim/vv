import os from 'os';
import { dialog } from 'electron';
import { execSync } from 'child_process';
import fixPath from 'fix-path';

const showInstallCliDialog = () =>
  dialog.showMessageBox({
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

const showCliInstalledDialog = (message, path) =>
  dialog.showMessageBox({
    message,
    detail: `Command line launcher installed at ${path}. You can run VV from terminal by typing:
$ vv [filename]
`,
    defaultId: 0,
    buttons: ['Ok'],
  });

const showErrorDialog = (error) => {
  dialog.showMessageBox({
    message: 'Error',
    detail: error.message,
    defaultId: 0,
    buttons: ['Ok'],
  });
};

const execOptions = () => {
  fixPath();
  return {
    encoding: 'UTF-8',
    env: process.env,
    cwd: os.homedir(),
  };
};

const installCli = binPath => () => {
  let path;
  try {
    path = execSync('which vv', execOptions());
  } catch (error) {
    path = null;
  }
  if (path && path.indexOf('VV.app/Contents/MacOS/vv') === -1) {
    path = path.replace('\n', '');
    showCliInstalledDialog('Command Line Launcher', path);
  } else {
    const response = showInstallCliDialog();
    if (response === 0) {
      try {
        path = execSync(`ln -s ${binPath} /usr/local/bin/`, execOptions());
      } catch (error) {
        showErrorDialog(error);
        return;
      }
      showCliInstalledDialog('Done', '/usr/local/bin/vv');
    }
  }
};

export default installCli;
