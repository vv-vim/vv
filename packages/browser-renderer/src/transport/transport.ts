import IpcRendererTransport from 'src/transport/ipc';
import WebSocketTransport from 'src/transport/websocket';
import isWeb from 'src/lib/isWeb';

const Transport = isWeb() ? WebSocketTransport : IpcRendererTransport;

export default Transport;
