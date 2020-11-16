import renderer from '@renderer/renderer';

import { initNvim } from '@renderer/nvim';
import initScreen from '@renderer/screen';
import initKeyboard from '@renderer/input/keyboard';
import initMouse from '@renderer/input/mouse';
import hideMouseCursor from '@renderer/features/hideMouseCursor';

const mockTransport = {
  on: jest.fn(),
};
jest.mock('@renderer/transport/transport', () => () => mockTransport);

jest.mock('@renderer/nvim', () => ({
  initNvim: jest.fn(() => 'fakeNvim'),
}));
jest.mock('@renderer/screen', () => jest.fn(() => 'fakeScreen'));
jest.mock('@renderer/input/keyboard', () => jest.fn());
jest.mock('@renderer/input/mouse', () => jest.fn());
jest.mock('@renderer/features/hideMouseCursor', () => jest.fn());

describe('renderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('adds initRenderer event to transport', () => {
    renderer();
    expect(mockTransport.on.mock.calls[0][0]).toBe('initRenderer');
  });

  test('init screen', () => {
    renderer();
    mockTransport.on.mock.calls[0][1]('settings');
    expect(initScreen).toHaveBeenCalledWith({ settings: 'settings', transport: mockTransport });
  });

  test('init nvim', () => {
    renderer();
    mockTransport.on.mock.calls[0][1]('settings');
    expect(initNvim).toHaveBeenCalledWith(mockTransport);
  });

  test('init keyboard', () => {
    renderer();
    mockTransport.on.mock.calls[0][1]('settings');
    expect(initKeyboard).toHaveBeenCalledWith({ nvim: 'fakeNvim', screen: 'fakeScreen' });
  });

  test('init mouse', () => {
    renderer();
    mockTransport.on.mock.calls[0][1]('settings');
    expect(initMouse).toHaveBeenCalledWith('fakeScreen');
  });

  test('init hideMouseCursor', () => {
    renderer();
    mockTransport.on.mock.calls[0][1]('settings');
    expect(hideMouseCursor).toHaveBeenCalledWith();
  });
});
