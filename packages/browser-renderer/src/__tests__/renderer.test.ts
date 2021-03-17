import renderer from 'src/renderer';

import Nvim from '@vvim/nvim';
import initScreen from 'src/screen';
import initKeyboard from 'src/input/keyboard';
import initMouse from 'src/input/mouse';
import hideMouseCursor from 'src/features/hideMouseCursor';

const mockTransport = {
  on: jest.fn(),
  nvim: 'nvimTransport',
};
jest.mock('src/transport/transport', () => () => mockTransport);

jest.mock('@vvim/nvim');
jest.mock('src/screen', () => jest.fn(() => 'fakeScreen'));
jest.mock('src/input/keyboard', () => jest.fn());
jest.mock('src/input/mouse', () => jest.fn());
jest.mock('src/features/hideMouseCursor', () => jest.fn());

describe('renderer', () => {
  const mockedNvim = <jest.Mock<Nvim>>Nvim;

  test('adds initRenderer event to transport', () => {
    renderer();
    expect(mockTransport.on.mock.calls[0][0]).toBe('initRenderer');
  });

  test('init screen', () => {
    renderer();
    mockTransport.on.mock.calls[0][1]('settings');
    expect(initScreen).toHaveBeenCalledWith({
      nvim: mockedNvim.mock.instances[0],
      settings: 'settings',
      transport: mockTransport,
    });
  });

  test('init nvim', () => {
    renderer();
    mockTransport.on.mock.calls[0][1]('settings');
    expect(Nvim).toHaveBeenCalledWith(mockTransport.nvim, true);
  });

  test('init keyboard', () => {
    renderer();
    mockTransport.on.mock.calls[0][1]('settings');
    expect(initKeyboard).toHaveBeenCalledWith({
      nvim: mockedNvim.mock.instances[0],
      screen: 'fakeScreen',
    });
  });

  test('init mouse', () => {
    renderer();
    mockTransport.on.mock.calls[0][1]('settings');
    expect(initMouse).toHaveBeenCalledWith({
      nvim: mockedNvim.mock.instances[0],
      screen: 'fakeScreen',
    });
  });

  test('init hideMouseCursor', () => {
    renderer();
    mockTransport.on.mock.calls[0][1]('settings');
    expect(hideMouseCursor).toHaveBeenCalledWith();
  });
});
