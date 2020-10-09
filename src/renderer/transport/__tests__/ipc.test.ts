import { ipcRenderer } from '@renderer/preloaded/electron';

import initTransport from '@renderer/transport/ipc';

jest.mock('@renderer/preloaded/electron', () => ({
  ipcRenderer: {
    on: jest.fn(),
    send: jest.fn(),
  },
}));

describe('main transport', () => {
  const transport = initTransport();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('on', () => {
    const listener = jest.fn();

    test('calls ipcRenderer.on with channel prop', () => {
      transport.on('test-channel', listener);
      expect((ipcRenderer.on as jest.Mock).mock.calls[0][0]).toBe('test-channel');
    });

    test('calls listener', () => {
      transport.on('test-channel', listener);
      const ipcListener = (ipcRenderer.on as jest.Mock).mock.calls[0][1];
      ipcListener('event', 'arg1', 'arg2');
      expect(listener).toHaveBeenCalledWith('arg1', 'arg2');
    });

    test('listener with no args', () => {
      transport.on('test-channel', listener);
      const ipcListener = (ipcRenderer.on as jest.Mock).mock.calls[0][1];
      ipcListener('event');
      expect(listener).toHaveBeenCalledWith();
    });
  });

  describe('send', () => {
    test('pass args to win.webContents', () => {
      transport.send('test-channel', 'arg1', 'arg2');
      expect(ipcRenderer.send).toHaveBeenCalledWith('test-channel', 'arg1', 'arg2');
    });

    test('with no args', () => {
      transport.send('test-channel');
      expect(ipcRenderer.send).toHaveBeenCalledWith('test-channel');
    });
  });
});
