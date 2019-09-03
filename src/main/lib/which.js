import { execSync } from 'child_process';
import shellEnv from './shellEnv';

// Checks if command exists in shell
// Returns path or false
const which = command => {
  let result;
  try {
    result = execSync(`which ${command}`, {
      encoding: 'UTF-8',
      env: shellEnv(),
    });
  } catch (e) {
    result = null;
  }
  return result;
};

export default which;
