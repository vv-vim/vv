import { execSync } from 'child_process';

import { mocked } from 'ts-jest/utils';

import { shellEnv, nvimVersion, resetCache } from 'src/utils';

jest.mock('child_process');

const mockedExecSync = mocked((execSync as unknown) as () => string);

describe('utils', () => {
  beforeEach(() => {
    resetCache();
  });

  describe('shellEnv', () => {
    const fakeProc = (env = {}) =>
      ({
        env,
      } as NodeJS.Process);

    test('returns env from bash', () => {
      mockedExecSync.mockReturnValue(`key1=val1\nkey2=val2`);
      expect(shellEnv(fakeProc())).toEqual({ key1: 'val1', key2: 'val2' });
      expect(mockedExecSync).toHaveBeenCalledWith('/bin/bash -ilc env', { encoding: 'utf-8' });
    });

    test('returns original env if it has SHLVL', () => {
      mockedExecSync.mockReturnValue(`key1=val1\nkey2=val2`);
      expect(shellEnv(fakeProc({ SHLVL: true, key: 'val' }))).toEqual({
        SHLVL: true,
        key: 'val',
      });
    });

    test('add default path if something happens', () => {
      mockedExecSync.mockImplementationOnce(() => {
        throw new Error();
      });
      expect(shellEnv(fakeProc({ PATH: 'some/path', key: 'val' }))).toEqual({
        PATH: '/usr/local/bin:some/path',
        key: 'val',
      });
    });
  });

  describe('nvimVersion', () => {
    test('find version string from `nvim --version`', () => {
      mockedExecSync.mockReturnValue(`Something
NVIM v1.2.3
Something else`);
      expect(nvimVersion()).toBe('1.2.3');
      expect(mockedExecSync).toHaveBeenCalledWith('nvim --version', expect.any(Object));
    });
  });
});
