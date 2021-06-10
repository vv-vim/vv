import { createDecodeStream, encode } from 'msgpack-lite';

import type { ChildProcessWithoutNullStreams } from 'child_process';
import type { DecodeStream } from 'msgpack-lite';
import type { RemoteTransport, NvimTransport, ReadCallback, OnCloseCallback } from 'src/types';

/**
 * NvimTransport that communicates directly with nvim process.
 * It also used as to communicate nvim api with remote transport.
 */
class ProcNvimTransport implements NvimTransport {
  private msgpackIn: DecodeStream;

  private proc: ChildProcessWithoutNullStreams;

  private remoteTransport: RemoteTransport;

  constructor(proc: ChildProcessWithoutNullStreams, remoteTransport: RemoteTransport) {
    this.proc = proc;
    this.remoteTransport = remoteTransport;

    const decodeStream = createDecodeStream();
    this.msgpackIn = this.proc.stdout.pipe(decodeStream);

    this.initRemoteTransportEvents();
  }

  private initRemoteTransportEvents() {
    this.remoteTransport.on('nvim-send', (payload: Parameters<ProcNvimTransport['write']>) =>
      this.write(...payload),
    );

    this.onClose(() => this.remoteTransport.send('nvim-close'));

    this.read((data) => this.remoteTransport.send('nvim-data', data));
  }

  write(id: number, command: string, params: string[]): void {
    if (this.proc.stdin.writable) {
      this.proc.stdin.write(encode([0, id, command, params]));
    }
  }

  read(callback: ReadCallback): void {
    this.msgpackIn.on('data', callback);
  }

  onClose(callback: OnCloseCallback): void {
    this.proc.on('close', callback);
  }
}

export default ProcNvimTransport;
