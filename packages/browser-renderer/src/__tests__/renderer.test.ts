import renderer from 'src/renderer';

import { initNvim } from 'src/nvim';
import initScreen from 'src/screen';
import initKeyboard from 'src/input/keyboard';
import initMouse from 'src/input/mouse';
import hideMouseCursor from 'src/features/hideMouseCursor';

const mockTransport = {
  on: jest.fn(),
};
jest.mock('src/transport/transport', () => () => mockTransport);

jest.mock('src/nvim', () => ({
  initNvim: jest.fn(() => 'fakeNvim'),
}));
jest.mock('src/screen', () => jest.fn(() => 'fakeScreen'));
jest.mock('src/input/keyboard', () => jest.fn());
jest.mock('src/input/mouse', () => jest.fn());
jest.mock('src/features/hideMouseCursor', () => jest.fn());

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
