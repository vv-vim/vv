import { ipcRenderer } from 'src/preloaded/electron';

import initTransport from 'src/transport/ipc';

jest.mock('src/preloaded/electron', () => ({
  ipcRenderer: {
    on: jest.fn(),
    send: jest.fn(),
  },
}));

describe('main transport', () => {
  const transport = initTransport();

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
