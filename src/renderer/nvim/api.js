import { spawn } from 'child_process';
import path from 'path';
import debounce from 'lodash/debounce';

import nvimCommand from '../../lib/nvimCommand';
import shell from '../../lib/shell';

const { attach } = global.require('neovim'); // ~100 ms lost here

let nvim;
let resourcesPath;

const vvSourceCommand = () => `source ${path.join(resourcesPath, 'bin/vv.vim')}`;

// Source vv specific ext on -u NONE
const fixNoConfig = args => {
  const uFlagIndex = args.indexOf('-u');
  if (uFlagIndex !== -1 && args[uFlagIndex + 1] === 'NONE') {
    nvim.command(vvSourceCommand());
  }
};

const startNvimProcess = ({ cwd, args }) => {
  const nvimArgs = ['--embed', '--cmd', vvSourceCommand(), ...args];

  const nvimProcess = spawn(
    nvimCommand(),
    nvimArgs.map(arg => `'${arg.replace(/'/g, "'\\''")}'`), // Escaping is broken with shell
    { cwd, shell }, // exec through shell is required to have correct env variables (ex. PATH)
  );

  // Pipe errors to std output and also send it in console as error.
  let errorStr = '';
  nvimProcess.stderr.pipe(process.stdout);
  nvimProcess.stderr.on('data', data => {
    errorStr += data.toString();
    debounce(() => {
      if (errorStr) console.error(errorStr); // eslint-disable-line no-console
      errorStr = '';
    }, 10)();
  });

  // nvimProcess.stdout.on('data', (data) => {
  //   console.log(data.toString());
  // });

  return nvimProcess;
};

export const initApi = async ({ args, cwd, resourcesPath: newResourcesPath }) => {
  resourcesPath = newResourcesPath;
  const proc = startNvimProcess({ args, cwd });
  nvim = await attach({ proc });
  fixNoConfig(args);
  return nvim;
};

const getNvim = () => {
  if (!nvim) {
    throw new Error('Neovim is not initialized');
  }
  return nvim;
};
export { getNvim as nvim };
export default getNvim;
