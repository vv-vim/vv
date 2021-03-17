import { PassThrough } from 'stream';
import { encode } from 'msgpack-lite';
import type { ChildProcessWithoutNullStreams } from 'child_process';

import ProcNvimTransport from 'src/main/nvim/ProcNvimTransport'; // eslint-disable-line

describe('ProcNvimTransport', () => {
  let stdout: PassThrough;
  let stdin: PassThrough;
  let transport: ProcNvimTransport;
  let callProcOnCloseCallback: () => void;
  const onData = jest.fn();

  beforeEach(() => {
    stdout = new PassThrough();
    stdin = new PassThrough();
    const proc = ({
      stdout,
      stdin,
      on: (event: string, callback: () => void) => {
        if (event === 'close') {
          callProcOnCloseCallback = callback;
        }
      },
    } as unknown) as ChildProcessWithoutNullStreams;
    transport = new ProcNvimTransport(proc);

    stdin.on('data', onData);
  });

  test('transport.read receives msgpack-encoded data from proc.stdout', () => {
    const readCallback = jest.fn();
    transport.read(readCallback);
    stdout.push(encode('hello'));

    expect(readCallback).toHaveBeenCalledWith('hello');
  });

  test('transport.onClose is called when proc is closed', () => {
    const handleClose = jest.fn();
    transport.onClose(handleClose);
    callProcOnCloseCallback();

    expect(handleClose).toHaveBeenCalled();
  });

  test('write sends msgpack-encoded data to stdin', async () => {
    transport.write(10, 'command', ['param1', 'param2']);

    expect(onData).toHaveBeenCalledWith(encode([0, 10, 'command', ['param1', 'param2']]));
  });

  test("don't write to stdin if it is not writable", async () => {
    stdin.end();
    transport.write(10, 'command', ['param1', 'param2']);

    expect(onData).not.toHaveBeenCalled();
  });
});
