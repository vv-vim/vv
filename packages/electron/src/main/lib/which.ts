import { execSync } from 'child_process';

import shellEnv from 'src/main/lib/shellEnv';

/**
 * Checks if command exists in shell.
 */
const which = (command: string): string | null => {
  let result: string | null | undefined;
  try {
    result = execSync(`which ${command}`, {
      encoding: 'utf-8',
      env: shellEnv(),
    });
  } catch (e) {
    result = null;
  }
  return result;
};

export default which;
