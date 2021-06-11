import { EventEmitter } from 'events';
import RemoteNvimTransport from 'src/RemoteNvimTransport';

describe('RemoteNvimTransport', () => {
  const remoteTransport = Object.assign(new EventEmitter(), {
    send: jest.fn(),
  });

  let remoteNvimTransport: RemoteNvimTransport;

  beforeEach(() => {
    remoteTransport.removeAllListeners();
    remoteNvimTransport = new RemoteNvimTransport(remoteTransport);
  });

  test('sends to remoteTransport `nvim-send` channel on write', () => {
    remoteNvimTransport.write(1, 'command', ['params']);
    expect(remoteTransport.send).toHaveBeenCalledWith('nvim-send', [1, 'command', ['params']]);
  });

  test('receive `nvim-data` callbacks on read', () => {
    const callback = jest.fn();
    remoteNvimTransport.read(callback);
    remoteTransport.emit('nvim-data', 'param1', 'param2');

    expect(callback).toHaveBeenCalledWith('param1', 'param2');
  });

  test('receive `nvim-close` callbacks on onClose', () => {
    const callback = jest.fn();
    remoteNvimTransport.onClose(callback);
    remoteTransport.emit('nvim-close');

    expect(callback).toHaveBeenCalledWith();
  });
});
