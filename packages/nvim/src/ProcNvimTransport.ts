import { createDecodeStream, encode } from 'msgpack-lite';
import { EventEmitter } from 'events';

import type { ChildProcessWithoutNullStreams } from 'child_process';
import type { DecodeStream } from 'msgpack-lite';
import type { Transport, MessageType } from 'src/types';

/**
 * Transport that communicates directly with nvim process.
 * It also used as to communicate nvim api with remote transport.
 */
class ProcNvimTransport extends EventEmitter implements Transport {
  private msgpackIn: DecodeStream;

  private proc: ChildProcessWithoutNullStreams;

  constructor(proc: ChildProcessWithoutNullStreams, remoteTransport?: Transport) {
    super();

    this.proc = proc;

    const decodeStream = createDecodeStream();
    this.msgpackIn = this.proc.stdout.pipe(decodeStream);

    this.proc.on('close', () => this.emit('nvim:close'));
    this.msgpackIn.on('data', (message: MessageType) => this.emit('nvim:data', message));

    if (remoteTransport) {
      this.attachRemoteTransport(remoteTransport);
    }
  }

  attachRemoteTransport(remoteTransport: Transport): void {
    remoteTransport.on('nvim:write', (...args: [number, string, string[]]) => this.write(...args));
    this.on('nvim:close', () => remoteTransport.send('nvim:close'));
    this.on('nvim:data', (data: MessageType) => remoteTransport.send('nvim:data', data));
  }

  private write(id: number, command: string, params: string[]): void {
    if (this.proc.stdin.writable) {
      this.proc.stdin.write(encode([0, id, command, params]));
    }
  }

  send(channel: string, id: number, command: string, params: string[]): void {
    if (channel === 'nvim:write') {
      this.write(id, command, params);
    }
  }
}

export default ProcNvimTransport;
