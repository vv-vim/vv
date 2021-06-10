import WebSocket from 'ws';
import { Server } from 'http';

import { RemoteTransport, Args } from '@vvim/nvim';

import { EventEmitter } from 'events';

class WsTransport extends EventEmitter implements RemoteTransport {
  ws: WebSocket;

  constructor(ws: WebSocket) {
    super();

    this.ws = ws;

    this.ws.on('message', (data: string) => {
      const [channel, args] = JSON.parse(data);
      this.emit(channel, args);
    });
  }

  send(channel: string, ...args: Args) {
    this.ws.send(JSON.stringify([channel, ...args]));
  }
}

/**
 * Init transport between main and renderer via websocket on server side.
 */
const transport = ({
  server,
  onConnect,
}: {
  server: Server;
  onConnect: (t: RemoteTransport) => void;
}): void => {
  const wss = new WebSocket.Server({ server });

  // TODO: handle disconnect
  wss.on('connection', (ws) => {
    onConnect(new WsTransport(ws));
  });
};

export default transport;
