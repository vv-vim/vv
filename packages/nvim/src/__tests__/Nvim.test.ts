import { EventEmitter } from 'events';
import Nvim from 'src/nvim';

import type { Transport } from 'src/types';

describe('Nvim', () => {
  const send = jest.fn();

  const transportMock: Transport = Object.assign(new EventEmitter(), {
    send,
  });

  let nvim: Nvim;

  beforeEach(() => {
    transportMock.removeAllListeners();
    nvim = new Nvim(transportMock);
  });

  describe('request', () => {
    test('call send with `nvim:write` on request', () => {
      nvim.request('command', ['param1', 'param2']);
      expect(send).toHaveBeenCalledWith('nvim:write', 3, 'nvim_command', ['param1', 'param2']);
    });

    test('increment request id on second call and it is always odd', () => {
      nvim.request('command1');
      expect(send).toHaveBeenCalledWith('nvim:write', 3, 'nvim_command1', []);
      nvim.request('command2');
      expect(send).toHaveBeenCalledWith('nvim:write', 5, 'nvim_command2', []);
    });

    test('in renderer mode request id is always even', () => {
      nvim = new Nvim(transportMock, true);
      nvim.request('command1');
      expect(send).toHaveBeenCalledWith('nvim:write', 2, 'nvim_command1', []);
      nvim.request('command2');
      expect(send).toHaveBeenCalledWith('nvim:write', 4, 'nvim_command2', []);
    });

    test('receives result of request', async () => {
      const resultPromise = nvim.request('command', ['param1', 'param2']);
      transportMock.emit('nvim:data', [1, 3, null, 'result']);
      expect(await resultPromise).toEqual('result');
    });

    test('reject on error returned', async () => {
      const resultPromise = nvim.request('command', ['param1', 'param2']);
      transportMock.emit('nvim:data', [1, 3, 'error']);
      await expect(resultPromise).rejects.toEqual('error');
    });
  });

  describe('notification', () => {
    test('send `nvim_subscribe` when you subscribe', () => {
      nvim.on('onSomething', () => null);
      expect(send).toHaveBeenCalledWith('nvim:write', 3, 'nvim_subscribe', ['onSomething']);
    });

    test('does not subscribe twice on the same event', () => {
      nvim.on('onSomething', () => null);
      nvim.on('onSomething', () => null);
      expect(send).toHaveBeenCalledWith('nvim:write', 3, 'nvim_subscribe', ['onSomething']);
      expect(send).toHaveBeenCalledTimes(1);
    });

    test('send `nvim_unsubscribe` when you subscribe', () => {
      const listener = () => null;
      nvim.on('onSomething', listener);
      nvim.removeListener('onSomething', listener);
      expect(send).toHaveBeenCalledWith('nvim:write', 5, 'nvim_unsubscribe', ['onSomething']);
    });

    test('does not unsubscribe if you have events with that name', () => {
      const listener = () => null;
      const anotherListener = () => null;
      nvim.on('onSomething', listener);
      nvim.on('onSomething', anotherListener);
      nvim.removeListener('onSomething', listener);
      expect(send).not.toHaveBeenCalledWith('nvim:write', 5, 'nvim_unsubscribe', ['onSomething']);
    });

    test('receives notification for subscription', () => {
      const callback = jest.fn();
      nvim.on('onSomething', callback);
      transportMock.emit('nvim:data', [2, 'onSomething', 'params1']);
      expect(callback).toHaveBeenCalledWith('params1');
      transportMock.emit('nvim:data', [2, 'onSomething', 'params2']);
      expect(callback).toHaveBeenCalledWith('params2');
    });

    test('does not receives notifications that are not subscribed', () => {
      const callback = jest.fn();
      nvim.on('onSomething', callback);
      transportMock.emit('nvim:data', [2, 'onSomethingElse', 'params1']);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('predefined commands', () => {
    const commands = [
      ['subscribe', 'subscribe'],
      ['unsubscribe', 'unsubscribe'],
      ['callFunction', 'call_function'],
      ['command', 'command'],
      ['input', 'input'],
      ['inputMouse', 'input_mouse'],
      ['getMode', 'get_mode'],
      ['uiTryResize', 'ui_try_resize'],
      ['uiAttach', 'ui_attach'],
      ['getHlByName', 'get_hl_by_name'],
      ['paste', 'paste'],
    ] as const;
    commands.forEach(([command, request]) => {
      test(`${command}`, () => {
        nvim = new Nvim(transportMock);
        nvim[command]('param1', 'param2');
        expect(send).toHaveBeenCalledWith('nvim:write', 3, `nvim_${request}`, ['param1', 'param2']);
      });
    });

    test('eval', () => {
      nvim = new Nvim(transportMock);
      nvim.eval('param1');
      expect(send).toHaveBeenCalledWith('nvim:write', 3, `nvim_eval`, ['param1']);
    });

    test('getShortMode returns mode', async () => {
      const resultPromise = nvim.getShortMode();
      transportMock.emit('nvim:data', [1, 3, null, { mode: 'n' }]);
      expect(await resultPromise).toBe('n');
    });

    test('getShortMode cut CTRL- from mode', async () => {
      const resultPromise = nvim.getShortMode();
      transportMock.emit('nvim:data', [1, 3, null, { mode: 'CTRL-n' }]);
      expect(await resultPromise).toBe('n');
    });
  });

  test('emit `close` when transport emits `nvim:close`', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();

    nvim.on('close', callback1);
    nvim.on('close', callback2);

    transportMock.emit('nvim:close');

    expect(callback1).toHaveBeenCalled();
    expect(callback2).toHaveBeenCalled();
  });
});
