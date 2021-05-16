import { spawn } from 'child_process';
import path from 'path';

import debounce from 'lodash/debounce';

import { shellEnv, isDev, nvimCommand } from 'src/utils';

import type { ChildProcessWithoutNullStreams } from 'child_process';

const vvSourceCommand = (appPath?: string) =>
  appPath ? `source ${path.join(appPath, isDev('./', '../'), 'bin/vv.vim')}` : 'source bin/vv.vim';

let nvimProcess;

const startNvimProcess = ({
  args = [],
  cwd,
  appPath,
}: {
  args?: string[];
  cwd?: string;
  appPath?: string;
} = {}): ChildProcessWithoutNullStreams => {
  const env = shellEnv();

  const nvimArgs = ['--embed', '--cmd', vvSourceCommand(appPath), ...args];

  nvimProcess = spawn(nvimCommand(env), nvimArgs, { cwd, env });

  // Pipe errors to std output and also send it in console as error.
  let errorStr = '';
  nvimProcess.stderr.pipe(process.stdout);
  nvimProcess.stderr.on('data', (data) => {
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

export default startNvimProcess;
