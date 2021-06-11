import { EventEmitter } from 'events';
import { PassThrough } from 'stream';
import { encode } from 'msgpack-lite';

import type { ChildProcessWithoutNullStreams } from 'child_process';

import ProcNvimTransport from 'src/ProcNvimTransport';

describe('ProcNvimTransport', () => {
  let proc: ChildProcessWithoutNullStreams;
  let transport: ProcNvimTransport;
  const onData = jest.fn();

  const remoteTransport = Object.assign(new EventEmitter(), {
    send: jest.fn(),
  });

  beforeEach(() => {
    proc = Object.assign(new EventEmitter(), {
      stdout: new PassThrough(),
      stdin: new PassThrough(),
    } as unknown) as ChildProcessWithoutNullStreams;
    proc.stdin.on('data', onData);

    transport = new ProcNvimTransport(proc, remoteTransport);
  });

  test('transport receives `nvim:data` event with msgpack-encoded data from proc.stdout', () => {
    const readCallback = jest.fn();
    transport.on('nvim:data', readCallback);
    proc.stdout.push(encode('hello'));
    expect(readCallback).toHaveBeenCalledWith('hello');
  });

  test('transport emits nvim:close when proc is closed', () => {
    const handleClose = jest.fn();
    transport.on('nvim:close', handleClose);
    proc.emit('close');
    expect(handleClose).toHaveBeenCalled();
  });

  test('send to `nvim:write` writes msgpack-encoded data to stdin', async () => {
    transport.send('nvim:write', 10, 'command', ['param1', 'param2']);
    expect(onData).toHaveBeenCalledWith(encode([0, 10, 'command', ['param1', 'param2']]));
  });

  test("don't write to stdin if it is not writable", async () => {
    proc.stdin.end();
    transport.send('nvim:write', 10, 'command', ['param1', 'param2']);
    expect(onData).not.toHaveBeenCalled();
  });

  describe('remoteTransport', () => {
    test('receives and relays to proc.stin `nvim-send` event from remoteTransport', () => {
      remoteTransport.emit('nvim:write', 1, 'command', ['params']);
      expect(onData).toHaveBeenCalledWith(encode([0, 1, 'command', ['params']]));
    });

    test('send `nvim:close` event to remoteTransport on close', () => {
      proc.emit('close');
      expect(remoteTransport.send).toHaveBeenCalledWith('nvim:close');
    });

    test('translate nvim proc stdout data to remoteTransport', () => {
      proc.stdout.push(encode('hello'));
      expect(remoteTransport.send).toHaveBeenCalledWith('nvim:data', 'hello');
    });

    test('has attachRemoteTransport method', () => {
      transport = new ProcNvimTransport(proc);
      transport.attachRemoteTransport(remoteTransport);
      proc.stdout.push(encode('hello'));
      expect(remoteTransport.send).toHaveBeenCalledWith('nvim:data', 'hello');
    });
  });
});
