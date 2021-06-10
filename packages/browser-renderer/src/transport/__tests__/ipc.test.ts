import { ipcRenderer } from 'src/preloaded/electron';

import IpcRendererTransport from 'src/transport/ipc';

jest.mock('src/preloaded/electron', () => ({
  ipcRenderer: {
    on: jest.fn(),
    send: jest.fn(),
  },
}));

describe('main transport', () => {
  let transport: IpcRendererTransport;
  const listener = jest.fn();

  beforeEach(() => {
    transport = new IpcRendererTransport();
  });

  describe('on', () => {
    test('calls ipcRenderer.on with channel prop', () => {
      transport.on('test-channel', listener);
      expect((ipcRenderer.on as jest.Mock).mock.calls[0][0]).toBe('test-channel');
    });

    test('calls listener', () => {
      transport.on('test-channel', listener);
      const ipcListener = (ipcRenderer.on as jest.Mock).mock.calls[0][1];
      ipcListener('_event', 'arg1', 'arg2');
      expect(listener).toHaveBeenCalledWith('arg1', 'arg2');
    });

    test('listener with no args', () => {
      transport.on('test-channel', listener);
      const ipcListener = (ipcRenderer.on as jest.Mock).mock.calls[0][1];
      ipcListener('_event');
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
