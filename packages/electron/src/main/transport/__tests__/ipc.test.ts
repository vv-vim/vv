import { BrowserWindow, IpcMain } from 'electron';
import { EventEmitter } from 'events';

import IpcTransport from 'src/main/transport/ipc';

describe('main transport', () => {
  let ipcMain: IpcMain;

  const win = (Object.assign(new EventEmitter(), {
    id: 'winId',
    webContents: {
      send: jest.fn(),
    },
  }) as unknown) as BrowserWindow;

  let transport: IpcTransport;

  beforeEach(() => {
    win.removeAllListeners();
    ipcMain = new EventEmitter() as IpcMain;
    transport = new IpcTransport(win, ipcMain);
  });

  describe('on', () => {
    const listener = jest.fn();

    test('calls listener if sender.id matches window id', () => {
      transport.on('test-event', listener);
      ipcMain.emit('test-event', { type: 'test-event', sender: { id: 'winId' } }, 'arg1', 'arg2');
      expect(listener).toHaveBeenCalledWith('arg1', 'arg2');
    });

    test('does not call listener if sender.id does not match window id', () => {
      transport.on('test-event', listener);
      ipcMain.emit(
        'test-event',
        { type: 'test-event', sender: { id: 'otherWinId' } },
        'arg1',
        'arg2',
      );
      expect(listener).not.toHaveBeenCalled();
    });

    test('listener with not args', () => {
      transport.on('test-event', listener);
      ipcMain.emit('test-event', { type: 'test-event', sender: { id: 'winId' } });
      expect(listener).toHaveBeenCalledWith();
    });

    test('removes event listener on win `closed` event', () => {
      transport.on('test-event', listener);
      jest.spyOn(ipcMain, 'removeListener');
      win.emit('closed');
      expect(ipcMain.removeListener).toHaveBeenCalledWith('test-event', expect.any(Function));
    });
  });

  test('unsubscribes from ipc event if there are not subscriptions left', () => {
    const listener = jest.fn();
    const addListenerSpy = jest.spyOn(ipcMain, 'on');
    const removeListenerSpy = jest.spyOn(ipcMain, 'removeListener');
    transport.on('test-event', listener);
    transport.off('test-event', listener);

    expect(removeListenerSpy).toHaveBeenCalledWith('test-event', addListenerSpy.mock.calls[0][1]);
  });

  describe('send', () => {
    test('pass args to win.webContents', () => {
      transport.send('test-event', 'arg1', 'arg2');
      expect(win.webContents.send).toHaveBeenCalledWith('test-event', 'arg1', 'arg2');
    });

    test('with no args', () => {
      transport.send('test-event');
      expect(win.webContents.send).toHaveBeenCalledWith('test-event');
    });

    test('does not send anything if window is closed', () => {
      win.emit('closed');
      transport.send('test-event');
      expect(win.webContents.send).not.toHaveBeenCalled();
    });
  });
});
