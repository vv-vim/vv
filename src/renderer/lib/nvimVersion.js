import fixPath from 'fix-path';

const { execSync } = global.require('child_process');

let version;

// Get nvim version. Returns array, for example for version 0.3.0 it will
// return [0, 3, 0]. If it fail for some reason, it will return null.
// Result is cached in `version` variable to avoid extra calls.
const nvimVersion = () => {
  if (version) return version;

  fixPath();
  try {
    const execResult = execSync('nvim --version', {
      encoding: 'UTF-8',
      env: process.env,
    });
    if (execResult) {
      const match = execResult.match(/NVIM v(\d+)\.(\d+).(\d+)/);
      if (match) {
        version = [match[1], match[2], match[3]].map(m => parseInt(m, 10));
      }
    }
  } catch (e) {
    version = null;
  }
  return version;
};

// stdioopen function only appears in nvim 0.3
export const hasStdioopen = () => (
  nvimVersion() && nvimVersion()[1] >= 3
);

export default nvimVersion;
