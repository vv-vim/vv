// import fixPath from 'fix-path';
import nvimCommand from './../../lib/nvimCommand';

const { execSync } = global.require('child_process');

let version;

// Get nvim version. For version 0.3.2 it will return [0, 3, 2, num: 3002].
// If it fail for some reason, it will return null.
// Result is cached in `version` variable to avoid extra calls.
const nvimVersion = () => {
  if (version) return version;

  // fixPath(); // TODO
  process.env.PATH += ':/usr/local/bin';
  try {
    const execResult = execSync(`${nvimCommand()} --version`, {
      encoding: 'UTF-8',
      env: process.env,
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

// stdioopen function only appears in nvim 0.3
export const hasStdioopen = () => nvimVersion() && nvimVersion()[1] >= 3;

// Starting from version 0.3.2 neovim will have different --embed API
// https://github.com/neovim/neovim/wiki/Following-HEAD#20180922
export const hasNewEmbedAPI = () => nvimVersion() && nvimVersion().num >= 3002;

export default nvimVersion;
