import { createDecodeStream, encode } from 'msgpack-lite';

import type { ChildProcessWithoutNullStreams } from 'child_process';
import type { DecodeStream } from 'msgpack-lite';
import type { NvimTransport, ReadCallback, OnCloseCallback } from 'src/types';

class ProcNvimTransport implements NvimTransport {
  private msgpackIn: DecodeStream;

  private proc: ChildProcessWithoutNullStreams;

  constructor(proc: ChildProcessWithoutNullStreams) {
    this.proc = proc;

    const decodeStream = createDecodeStream();
    this.msgpackIn = this.proc.stdout.pipe(decodeStream);
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
