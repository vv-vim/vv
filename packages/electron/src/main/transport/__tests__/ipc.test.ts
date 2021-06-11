import { BrowserWindow, IpcMain } from 'electron';
import { EventEmitter } from 'events';

import IpcTransport from 'src/main/transport/ipc';

describe('main transport', () => {
  const ipcMain = new EventEmitter() as IpcMain;

  const win = (Object.assign(new EventEmitter(), {
    id: 'winId',
    webContents: {
      send: jest.fn(),
    },
  }) as unknown) as BrowserWindow;

  let transport: IpcTransport;

  beforeEach(() => {
    transport = new IpcTransport(win, ipcMain);
  });

  describe('on', () => {
    const listener = jest.fn();

    test('calls listener if sender.id matches window id', () => {
      transport.on('test-channel', listener);
      ipcMain.emit('test-channel', { sender: { id: 'winId' } }, 'arg1', 'arg2');
      expect(listener).toHaveBeenCalledWith('arg1', 'arg2');
    });

    test('does not call listener if sender.id does not match window id', () => {
      ipcMain.emit('test-channel', { sender: { id: 'otherWinId' } }, 'arg1', 'arg2');
      expect(listener).not.toHaveBeenCalled();
    });

    test('listener with not args', () => {
      ipcMain.emit('test-channel', { sender: { id: 'winId' } });
      expect(listener).toHaveBeenCalledWith();
    });

    test('removes event listener on win `closed` event', () => {
      transport.on('test-channel', listener);
      jest.spyOn(ipcMain, 'removeListener');
      win.emit('closed');
      expect(ipcMain.removeListener).toHaveBeenCalledWith('test-channel', expect.any(Function));
    });

    test('events order', () => {
      const result: string[] = [];
      transport.on('test-channel', () => {
        result.push('event1');
      });
      transport.on('test-channel', () => {
        result.push('event2');
      });
      transport.prependListener('test-channel', () => {
        result.push('event3');
      });
      ipcMain.emit('test-channel', { sender: { id: 'winId' } });
      expect(result).toEqual(['event3', 'event1', 'event2']);
    });

    test('once', () => {
      const result: string[] = [];
      transport.once('test-channel', () => {
        result.push('event1');
      });
      transport.on('test-channel', () => {
        result.push('event2');
      });
      ipcMain.emit('test-channel', { sender: { id: 'winId' } });
      ipcMain.emit('test-channel', { sender: { id: 'winId' } });
      expect(result).toEqual(['event1', 'event2', 'event2']);
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
      win.emit('closed');
      transport.send('test-channel');
      expect(win.webContents.send).not.toHaveBeenCalled();
    });
  });
});
