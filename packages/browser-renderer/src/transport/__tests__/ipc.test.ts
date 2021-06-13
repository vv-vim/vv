import { EventEmitter } from 'events';
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
  let ipcRendererMock: Electron.IpcRenderer;
  const send = jest.fn();

  beforeEach(() => {
    ipcRendererMock = (Object.assign(new EventEmitter(), {
      send,
    }) as unknown) as Electron.IpcRenderer;
    transport = new IpcRendererTransport(ipcRendererMock);
  });

  describe('on', () => {
    const listener = jest.fn();

    test('calls listener', () => {
      transport.on('test-event', listener);
      ipcRendererMock.emit('test-event', new Event('test-event'), 'arg1', 'arg2');
      expect(listener).toHaveBeenCalledWith('arg1', 'arg2');
    });

    test('does not call listener twice listener', () => {
      const anotherListener = jest.fn();
      transport.on('test-event', listener);
      transport.on('test-event', anotherListener);
      ipcRendererMock.emit('test-event', new Event('test-event'), 'arg1', 'arg2');
      expect(listener).toHaveBeenCalledTimes(1);
      expect(anotherListener).toHaveBeenCalledTimes(1);
    });

    test('listener with no args', () => {
      transport.on('test-event', listener);
      ipcRendererMock.emit('test-event', new Event('test-event'));
      expect(listener).toHaveBeenCalledWith();
    });

    test('use preloaded ipcRenderer if it is not passed', () => {
      transport = new IpcRendererTransport();
      transport.on('test-event', listener);
      expect(ipcRenderer.on).toHaveBeenCalledWith('test-event', expect.any(Function));
    });
  });

  describe('once', () => {
    const listener = jest.fn();

    test('calls listener once', () => {
      transport.once('test-event', listener);
      ipcRendererMock.emit('test-event', new Event('test-event'), 'arg1', 'arg2');
      ipcRendererMock.emit('test-event', new Event('test-event'), 'arg1', 'arg2');
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('removeListener', () => {
    const listener = jest.fn();

    test('does not call listener after off', () => {
      transport.on('test-event', listener);
      transport.removeListener('test-event', listener);
      ipcRendererMock.emit('test-event', new Event('test-event'), 'arg1', 'arg2');
      expect(listener).not.toHaveBeenCalled();
    });

    test('other subscribed events work', () => {
      const anotherListener = jest.fn();
      transport.on('test-event', listener);
      transport.on('test-event', anotherListener);
      transport.removeListener('test-event', anotherListener);
      ipcRendererMock.emit('test-event', new Event('test-event'), 'arg1', 'arg2');
      expect(listener).toHaveBeenCalled();
    });

    test('unsubscribes from ipc event if there are not subscriptions left', () => {
      const addListenerSpy = jest.spyOn(ipcRendererMock, 'on');
      const removeListenerSpy = jest.spyOn(ipcRendererMock, 'removeListener');
      transport.on('test-event', listener);
      transport.off('test-event', listener);

      expect(removeListenerSpy).toHaveBeenCalledWith('test-event', addListenerSpy.mock.calls[0][1]);
    });
  });

  describe('send', () => {
    test('pass args to win.webContents', () => {
      transport.send('test-event', 'arg1', 'arg2');
      expect(send).toHaveBeenCalledWith('test-event', 'arg1', 'arg2');
    });

    test('with no args', () => {
      transport.send('test-event');
      expect(send).toHaveBeenCalledWith('test-event');
    });
  });
});
