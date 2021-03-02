import { Transport, Listener } from 'src/transport/types';

/**
 * Init transport between main and renderer via WebSocket.
 */
const transport = (): Transport => {
  const socket = new WebSocket(`ws://${window.location.host}`);

  const callbacks: Record<string, Listener[]> = {};

  const addCallback = (channel: string, listener: Listener) => {
    callbacks[channel] = [...(callbacks[channel] || []), listener];
  };

  socket.onmessage = ({ data }) => {
    const [channel, args] = JSON.parse(data);
    if (callbacks[channel]) {
      callbacks[channel].forEach((listener) => listener(args));
    }
  };

  return {
    on: (channel, listener) => {
      addCallback(channel, listener);
    },

    send: (channel, ...args) => {
      socket.send(JSON.stringify([channel, ...args]));
    },

    nvim: {
      write: (id: number, command: string, params: string[]) => {
        socket.send(JSON.stringify(['nvim-send', [id, command, params]]));
      },

      read: (callback) => {
        addCallback('nvim-data', callback);
      },
    },
  };
};

export default transport;
