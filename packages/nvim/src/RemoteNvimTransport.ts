import type { RemoteTransport, NvimTransport, ReadCallback, OnCloseCallback } from 'src/types';

/**
 * NvimTransport that communicates with nvim via remote transport.
 */
class RemoteNvimTransport implements NvimTransport {
  private remoteTransport: RemoteTransport;

  constructor(remoteTransport: RemoteTransport) {
    this.remoteTransport = remoteTransport;
  }

  write(id: number, command: string, params: any[]): void {
    this.remoteTransport.send('nvim-send', [id, command, params]);
  }

  read(callback: ReadCallback): void {
    this.remoteTransport.on('nvim-data', callback);
  }

  onClose(callback: OnCloseCallback): void {
    this.remoteTransport.on('nvim-close', () => callback());
  }
}

export default RemoteNvimTransport;
