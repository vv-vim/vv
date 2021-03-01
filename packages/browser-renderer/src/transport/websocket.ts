import { Transport, Listener } from 'src/transport/types';

/**
 * Init transport between main and renderer via WebSocket.
 */
const transport = (): Transport => {
  const socket = new WebSocket(`ws://${window.location.host}`);

  const callbacks: Record<string, Listener[]> = {};

  socket.onmessage = ({ data }) => {
    const [channel, ...args] = JSON.parse(data);
    if (callbacks[channel]) {
      callbacks[channel].forEach((listener) => listener(...args));
    }
  };

  return {
    on: (channel, listener) => {
      callbacks[channel] = [...(callbacks[channel] || []), listener];
    },

    send: (channel, ...args) => {
      socket.send(JSON.stringify([channel, ...args]));
    },
  };
};

export default transport;
