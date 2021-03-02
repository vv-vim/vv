import ipcTransport from 'src/transport/ipc';
import websocketTransport from 'src/transport/websocket';
import isWeb from 'src/lib/isWeb';
import type { Transport } from 'src/transport/types';

const transport = (): Transport => (isWeb() ? websocketTransport() : ipcTransport());

export default transport;
