import { execSync } from 'child_process';

type IsDevFunction = {
  <T, F>(dev: T, notDev: F): T | F;
  (): boolean;
};

export const isDev: IsDevFunction = (dev = true, notDev = false) =>
  process.env.NODE_ENV === 'development' ? dev : notDev;

export const nvimCommand = (env: NodeJS.ProcessEnv = {}): string =>
  env.VV_NVIM_COMMAND || process.env.VV_NVIM_COMMAND || 'nvim';

/**
 * Cached patched `process.env` used in `shellEnv` function.
 */
let env: NodeJS.ProcessEnv | undefined;

/**
 * Find env variables if the app is started from Finder. We need a correct PATH variable to
 * start nvim.
 */
export const shellEnv = (proc = process): NodeJS.ProcessEnv => {
  if (!env) {
    env = proc.env;
    // If we start app from terminal, it will have SHLVL variable. Then we already have correct
    // env variables and can skip this.
    if (!env.SHLVL) {
      try {
        // Try to get user's default shell and get env from it.
        const envString = execSync(`${env.SHELL || '/bin/bash'} -ilc env`, { encoding: 'utf-8' });
        env = envString
          .split('\n')
          .filter(Boolean)
          .reduce((result, line) => {
            const [key, ...vals] = line.split('=');
            return {
              ...result,
              [key]: vals.join('='),
            };
          }, {});
      } catch (e) {
        // Most likely nvim is here.
        env.PATH = `/usr/local/bin:/opt/homebrew/bin:${env.PATH}`;
      }
    }
  }
  return env;
};

/**
 * Cached Neovim version used in `nvimVersion` function.
 */
let version: string | undefined | null;

/**
 * Get Neovim version string.
 */
export const nvimVersion = (): string | undefined | null => {
  if (version !== undefined) return version;

  const shEnv = shellEnv();
  try {
    const execResult = execSync(`${nvimCommand(shEnv)} --version`, {
      encoding: 'utf-8',
      env: shEnv,
    });
    if (execResult) {
      const match = execResult.match(/NVIM v(\d+)\.(\d+).(\d+)(.*)/);
      if (match) {
        version = `${match[1]}.${match[2]}.${match[3]}${match[4]}`;
      }
    }
  } catch (e) {
    version = null;
  }
  return version;
};

/** @deprecated helper function for tests */
export const resetCache = (): void => {
  version = undefined;
  env = undefined;
};
