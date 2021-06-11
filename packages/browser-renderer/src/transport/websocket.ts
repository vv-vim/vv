import { EventEmitter } from 'events';
import type { Transport, Args } from '@vvim/nvim';

/**
 * Init transport between main and renderer via WebSocket.
 */
class WebSocketTransport extends EventEmitter implements Transport {
  socket: WebSocket;

  constructor() {
    super();

    this.socket = new WebSocket(`ws://${window.location.host}`);

    this.socket.onmessage = ({ data }) => {
      const [channel, args] = JSON.parse(data);
      this.emit(channel, args);
    };
  }

  send(channel: string, ...args: Args): void {
    this.socket.send(JSON.stringify([channel, ...args]));
  }
}

export default WebSocketTransport;
