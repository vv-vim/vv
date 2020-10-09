import ipcTransport from '@renderer/transport/ipc';
import websocketTransport from '@renderer/transport/websocket';
import isWeb from '@renderer/lib/isWeb';

import { Transport } from '@renderer/transport/types';

const transport = (): Transport => (isWeb() ? websocketTransport() : ipcTransport());

export default transport;
