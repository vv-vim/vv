import Nvim from 'src/nvim';

import type { NvimTransport } from 'src/types';

describe('Nvim', () => {
  const read = jest.fn();
  const write = jest.fn();
  const onClose = jest.fn();

  const transportMock: NvimTransport = {
    write,
    read,
    onClose,
  };

  let nvim: Nvim;
  let simulateResponse: (...args: any[]) => void; // eslint-disable-line @typescript-eslint/no-explicit-any

  beforeEach(() => {
    nvim = new Nvim(transportMock);
    simulateResponse = read.mock.calls[0][0];
  });

  describe('request', () => {
    test('call write on request', () => {
      nvim.request('command', ['param1', 'param2']);
      expect(write).toHaveBeenCalledWith(3, 'nvim_command', ['param1', 'param2']);
    });

    test('increment request id on second call and it is always odd', () => {
      nvim.request('command1');
      expect(write).toHaveBeenCalledWith(3, 'nvim_command1', []);
      nvim.request('command2');
      expect(write).toHaveBeenCalledWith(5, 'nvim_command2', []);
    });

    test('in renderer mode request id is always even', () => {
      nvim = new Nvim(transportMock, true);
      nvim.request('command1');
      expect(write).toHaveBeenCalledWith(2, 'nvim_command1', []);
      nvim.request('command2');
      expect(write).toHaveBeenCalledWith(4, 'nvim_command2', []);
    });

    test('receives result of request', async () => {
      const resultPromise = nvim.request('command', ['param1', 'param2']);
      simulateResponse([1, 3, null, 'result']);
      expect(await resultPromise).toEqual('result');
    });

    test('reject on error returned', async () => {
      const resultPromise = nvim.request('command', ['param1', 'param2']);
      simulateResponse([1, 3, 'error']);
      await expect(resultPromise).rejects.toEqual('error');
    });
  });

  describe('notification', () => {
    test('send `subscribe` when you subscribe', () => {
      nvim.on('onSomething', () => null);
      expect(write).toHaveBeenCalledWith(3, 'nvim_subscribe', ['onSomething']);
    });

    test('receives notification for subscription', () => {
      const callback = jest.fn();
      nvim.on('onSomething', callback);
      simulateResponse([2, 'onSomething', 'params1']);
      expect(callback).toHaveBeenCalledWith('params1');
      simulateResponse([2, 'onSomething', 'params2']);
      expect(callback).toHaveBeenCalledWith('params2');
    });

    test('does not receives notifications that are not subscribed', () => {
      const callback = jest.fn();
      nvim.on('onSomething', callback);
      simulateResponse([2, 'onSomethingElse', 'params1']);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('predefined commands', () => {
    test('commands', () => {
      const commands = [
        ['subscribe', 'subscribe'],
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
        write.mockClear();
        nvim = new Nvim(transportMock);
        nvim[command]('param1', 'param2');
        expect(write).toHaveBeenCalledWith(3, `nvim_${request}`, ['param1', 'param2']);
      });
    });

    test('eval', () => {
      write.mockClear();
      nvim = new Nvim(transportMock);
      nvim.eval('param1');
      expect(write).toHaveBeenCalledWith(3, `nvim_eval`, ['param1']);
    });

    test('getShortMode returns mode', async () => {
      const resultPromise = nvim.getShortMode();
      simulateResponse([1, 3, null, { mode: 'n' }]);
      expect(await resultPromise).toBe('n');
    });

    test('getShortMode cut CTRL- from mode', async () => {
      const resultPromise = nvim.getShortMode();
      simulateResponse([1, 3, null, { mode: 'CTRL-n' }]);
      expect(await resultPromise).toBe('n');
    });
  });

  test('onClose', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();

    nvim.on('close', callback1);
    nvim.on('close', callback2);

    onClose.mock.calls[0][0]();

    expect(callback1).toHaveBeenCalled();
    expect(callback2).toHaveBeenCalled();
  });
});
