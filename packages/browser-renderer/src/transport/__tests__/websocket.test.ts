import WebSocketTransport from 'src/transport/websocket';

describe('websocket transport', () => {
  const OriginalWebSocket = WebSocket;

  const constructor = jest.fn();
  const send = jest.fn();
  let onmessage: (x: { data: string }) => void;
  const listener = jest.fn();

  class MockWebSocket {
    constructor(...args: any[]) {
      constructor(...args);
    }

    // eslint-disable-next-line class-methods-use-this
    send(...args: any[]) {
      send(...args);
    }

    // eslint-disable-next-line class-methods-use-this
    set onmessage(value: (x: { data: string }) => void) {
      onmessage = value;
    }
  }

  let transport: WebSocketTransport;

  beforeEach(() => {
    // @ts-expect-error Mocking WebSocket
    global.WebSocket = MockWebSocket;

    transport = new WebSocketTransport();
  });

  afterEach(() => {
    global.WebSocket = OriginalWebSocket;
  });

  test('connects to websocket', () => {
    expect(constructor).toHaveBeenCalledWith('ws://localhost');
  });

  test('send method sends channel and args to websocket', () => {
    transport.send('channel', 'arg1', 'arg2');
    expect(send).toHaveBeenCalledWith('["channel","arg1","arg2"]');
  });

  test('sent message is JSON stringified', () => {
    transport.send('channel', { complex: { object: true } });
    expect(send).toHaveBeenCalledWith('["channel",{"complex":{"object":true}}]');
  });

  test('receive message if you subscribe to chanel', () => {
    transport.on('channel', listener);

    onmessage({ data: JSON.stringify(['channel', ['arg1', 'arg2']]) });
    expect(listener).toHaveBeenCalledWith(['arg1', 'arg2']);

    onmessage({ data: JSON.stringify(['channel', ['arg3']]) });
    expect(listener).toHaveBeenCalledWith(['arg3']);
  });

  test("don't receive messages for channels you did not subscribe", () => {
    transport.on('channel', listener);
    onmessage({ data: JSON.stringify(['other-channel', ['arg1', 'arg2']]) });
    expect(listener).not.toHaveBeenCalled();
  });
});
