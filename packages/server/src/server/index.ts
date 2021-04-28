import express from 'express';
import http from 'http';

import initNvim from 'src/server/nvim/nvim';
import { getDefaultSettings } from 'src/server/nvim/settings';
import websocketTransport from 'src/server/transport/websocket';

import { Transport } from 'src/server/transport/types';

const { PORT = 3000 } = process.env;

const app = express();
const server = http.createServer(app);

app.use(express.static('build'));

const onConnect = (transport: Transport) => {
  const args = process.argv.slice(2);

  initNvim({
    transport,
    args,
  });
  transport.send('initRenderer', getDefaultSettings());
};

websocketTransport({ server, onConnect });

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server started at http://localhost:${PORT}`);
});
