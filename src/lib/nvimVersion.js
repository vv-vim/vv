import { execSync } from 'child_process';

import nvimCommand from './nvimCommand';
import shell from './shell';

let version;

// Get nvim version. For version 0.3.2 it will return [0, 3, 2, num: 3002].
// If it fail for some reason, it will return null.
// Result is cached in `version` variable to avoid extra calls.
const nvimVersion = () => {
  if (version) return version;

  try {
    const execResult = execSync(`${nvimCommand()} --version`, {
      encoding: 'UTF-8',
      shell,
    });
    if (execResult) {
      const match = execResult.match(/NVIM v(\d+)\.(\d+).(\d+)/);
      if (match) {
        version = [match[1], match[2], match[3]].map(m => parseInt(m, 10));
        version.num = version.reduce((r, v) => r * 1000 + v, 0);
      }
    }
  } catch (e) {
    version = null;
  }
  return version;
};

export default nvimVersion;
