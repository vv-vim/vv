import { execSync } from 'child_process';
import fixPath from 'fix-path';

// Checks if command exists in shell
// Returns path or false
const which = (command) => {
  fixPath();
  let result;
  try {
    result = execSync(`which ${command}`, {
      encoding: 'UTF-8',
      env: process.env,
    });
  } catch (e) {
    result = null;
  }
  return result;
};

export default which;
