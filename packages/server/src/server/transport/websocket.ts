import WebSocket from 'ws';
import { Server } from 'http';

import { Transport, Listener } from '@server/transport/types';

/**
 * Init transport between main and renderer via websocket on server side.
 */
const transport = ({
  server,
  onConnect,
}: {
  server: Server;
  onConnect: (t: Transport) => void;
}): void => {
  const wss = new WebSocket.Server({ server });

  // TODO: handle disconnect
  wss.on('connection', (ws) => {
    const callbacks: Record<string, Listener[]> = {};

    ws.on('message', (data: string) => {
      const [channel, ...args] = JSON.parse(data);
      if (callbacks[channel]) {
        callbacks[channel].forEach((listener) => listener(...args));
      }
    });

    onConnect({
      on: (channel, listener) => {
        callbacks[channel] = [...(callbacks[channel] || []), listener];
      },

      send: (channel, ...args) => {
        ws.send(JSON.stringify([channel, ...args]));
      },
    });
  });
};

export default transport;
