import { ipcRenderer } from 'src/preloaded/electron';

import initTransport from 'src/transport/ipc';

import type { Transport } from 'src/transport/types';

jest.mock('src/preloaded/electron', () => ({
  ipcRenderer: {
    on: jest.fn(),
    send: jest.fn(),
  },
}));

describe('main transport', () => {
  let transport: Transport;
  const listener = jest.fn();

  beforeEach(() => {
    transport = initTransport();
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

  describe('nvim', () => {
    test("nvim write sends params to ipcRenderer via 'nvim-send'", () => {
      transport.nvim.write(1, 'test-channel', ['arg1', 'arg2']);
      expect(ipcRenderer.send).toHaveBeenCalledWith('nvim-send', [
        1,
        'test-channel',
        ['arg1', 'arg2'],
      ]);
    });

    test('nvim read subscribes to `ipcRenderer` `nvim-data`', () => {
      transport.nvim.read(listener);
      expect(ipcRenderer.on).toHaveBeenCalledWith('nvim-data', expect.any(Function));
      const ipcListener = (ipcRenderer.on as jest.Mock).mock.calls[0][1];
      ipcListener('_event', ['arg1', 'arg2']);
      expect(listener).toHaveBeenCalledWith(['arg1', 'arg2']);
    });

    test('nvim onClose subscribes to `ipcRenderer` `nvim-close`', () => {
      transport.nvim.onClose(listener);
      expect(ipcRenderer.on).toHaveBeenCalledWith('nvim-close', expect.any(Function));
      const ipcListener = (ipcRenderer.on as jest.Mock).mock.calls[0][1];
      ipcListener('_event', ['arg1', 'arg2']);
      expect(listener).toHaveBeenCalledWith();
    });
  });
});
