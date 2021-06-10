import { EventEmitter } from 'events';
import initRenderer from 'src/renderer';

import Nvim, { RemoteNvimTransport } from '@vvim/nvim';
import initScreen from 'src/screen';
import initKeyboard from 'src/input/keyboard';
import initMouse from 'src/input/mouse';
import hideMouseCursor from 'src/features/hideMouseCursor';

const mockTransport = new EventEmitter();
jest.mock('src/transport/transport', () => () => mockTransport);

jest.mock('@vvim/nvim');
jest.mock('src/screen', () => jest.fn(() => 'fakeScreen'));
jest.mock('src/input/keyboard', () => jest.fn());
jest.mock('src/input/mouse', () => jest.fn());
jest.mock('src/features/hideMouseCursor', () => jest.fn());

describe('renderer', () => {
  const mockedNvim = Nvim as jest.Mock<Nvim>;
  const mockedRemoteNvimTransport = RemoteNvimTransport as jest.Mock<RemoteNvimTransport>;

  beforeEach(() => {
    mockTransport.removeAllListeners();
    initRenderer();
  });

  test('init screen', () => {
    mockTransport.emit('initRenderer', 'settings');
    expect(initScreen).toHaveBeenCalledWith({
      nvim: mockedNvim.mock.instances[0],
      settings: 'settings',
      transport: mockTransport,
    });
  });

  test('init nvim', () => {
    mockTransport.emit('initRenderer', 'settings');
    expect(mockedRemoteNvimTransport).toHaveBeenCalledWith(mockTransport);
    expect(Nvim).toHaveBeenCalledWith(mockedRemoteNvimTransport.mock.instances[0], true);
  });

  test('init keyboard', () => {
    mockTransport.emit('initRenderer', 'settings');
    expect(initKeyboard).toHaveBeenCalledWith({
      nvim: mockedNvim.mock.instances[0],
      screen: 'fakeScreen',
    });
  });

  test('init mouse', () => {
    mockTransport.emit('initRenderer', 'settings');
    expect(initMouse).toHaveBeenCalledWith({
      nvim: mockedNvim.mock.instances[0],
      screen: 'fakeScreen',
    });
  });

  test('init hideMouseCursor', () => {
    mockTransport.emit('initRenderer', 'settings');
    expect(hideMouseCursor).toHaveBeenCalledWith();
  });
});
