import { PassThrough } from 'stream';
import { spawn } from 'child_process';
import type { ChildProcessWithoutNullStreams } from 'child_process';
import { mocked } from 'ts-jest/utils';

import startNvimProcess from 'src/process';

jest.mock('child_process');

const mockedSpawn = mocked(spawn);

mockedSpawn.mockImplementation(
  () =>
    (({
      stderr: new PassThrough(),
      stdout: new PassThrough(),
      stdin: new PassThrough(),
    } as unknown) as ChildProcessWithoutNullStreams),
);

describe('startNvimProcess', () => {
  test('init nvim process with spawn', () => {
    startNvimProcess();
    expect(mockedSpawn).toHaveBeenCalledWith(
      'nvim',
      ['--embed', '--cmd', 'source bin/vv.vim'],
      expect.anything(),
    );
  });

  test.todo('TODO: test vvSourceCommand');
  test.todo('TODO: test nvimCommand');
  test.todo('TODO: test env');
  test.todo('TODO: test cwd');
});
