import { ipcMain, BrowserWindow } from 'electron';

import initTransport from 'src/main/transport/ipc';

jest.mock('electron', () => ({
  ipcMain: {
    on: jest.fn(),
    removeListener: jest.fn(),
  },
}));

describe('main transport', () => {
  const win = ({
    id: 'winId',
    on: jest.fn(),
    webContents: {
      send: jest.fn(),
    },
  } as unknown) as BrowserWindow;

  const transport = initTransport(win);

  describe('on', () => {
    const listener = jest.fn();

    test('calls ipcMain.on with channel prop', () => {
      transport.on('test-channel', listener);
      expect((ipcMain.on as jest.Mock).mock.calls[0][0]).toBe('test-channel');
    });

    test('calls listener if sender.id matches window id', () => {
      transport.on('test-channel', listener);
      const ipcListener = (ipcMain.on as jest.Mock).mock.calls[0][1];
      ipcListener({ sender: { id: 'winId' } }, 'arg1', 'arg2');
      expect(listener).toHaveBeenCalledWith('arg1', 'arg2');
    });

    test('does not call listener if sender.id does not match window id', () => {
      transport.on('test-channel', listener);
      const ipcListener = (ipcMain.on as jest.Mock).mock.calls[0][1];
      ipcListener({ sender: { id: 'otherWinId' } }, 'arg1', 'arg2');
      expect(listener).not.toHaveBeenCalled();
    });

    test('listener with not args', () => {
      transport.on('test-channel', listener);
      const ipcListener = (ipcMain.on as jest.Mock).mock.calls[0][1];
      ipcListener({ sender: { id: 'winId' } });
      expect(listener).toHaveBeenCalledWith();
    });

    test('subscribes to win `closed` event', () => {
      transport.on('test-channel', listener);
      expect(win.on).toHaveBeenCalledWith('closed', expect.any(Function));
    });

    test('removes event listener on win `closed` event', () => {
      transport.on('test-channel', listener);
      (win.on as jest.Mock).mock.calls[0][1]();
      expect(ipcMain.removeListener).toHaveBeenCalledWith('test-channel', expect.any(Function));
    });
  });

  describe('send', () => {
    test('pass args to win.webContents', () => {
      transport.send('test-channel', 'arg1', 'arg2');
      expect(win.webContents.send).toHaveBeenCalledWith('test-channel', 'arg1', 'arg2');
    });

    test('with no args', () => {
      transport.send('test-channel');
      expect(win.webContents.send).toHaveBeenCalledWith('test-channel');
    });

    test('does not send anything if window is closed', () => {
      const t = initTransport(win);
      (win.on as jest.Mock).mock.calls[0][1]();
      t.send('test-channel');
      expect(win.webContents.send).not.toHaveBeenCalled();
    });
  });
});
