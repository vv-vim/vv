import { ipcMain, BrowserWindow } from 'electron';

import initTransport from '../transport';

jest.mock('electron', () => ({
  ipcMain: {
    on: jest.fn(),
  },
}));

describe('main transport', () => {
  const send = jest.fn();

  const win = ({
    webContents: {
      id: 'winId',
      send,
    },
  } as unknown) as BrowserWindow;

  const transport = initTransport(win);

  beforeEach(() => {
    jest.clearAllMocks();
  });

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
  });

  describe('send', () => {
    test('pass args to win.webContents', () => {
      transport.send('test-channel', 'arg1', 'arg2');
      expect(send).toHaveBeenCalledWith('test-channel', 'arg1', 'arg2');
    });

    test('with no args', () => {
      transport.send('test-channel');
      expect(send).toHaveBeenCalledWith('test-channel');
    });
  });
});
