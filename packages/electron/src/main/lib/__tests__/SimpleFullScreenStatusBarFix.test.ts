import { BrowserWindow } from 'electron';
import EventEmitter from 'events';

import { mocked } from 'ts-jest/utils';

import SimpleFullScreenStatusBarFix from 'src/main/lib/SimpleFullScreenStatusBarFix';

jest.mock('electron', () => ({ BrowserWindow: jest.fn() }));

class MockWindowEmitter extends EventEmitter {
  isSfs: boolean;

  constructor(isSfs: boolean) {
    super();
    this.isSfs = isSfs;
  }

  isSimpleFullScreen() {
    return this.isSfs;
  }
}

const asBrowserWindow = (b: unknown) => b as BrowserWindow;

describe('SimpleFullScreenStatusBarFix', () => {
  test('creates hidden browser window', () => {
    new SimpleFullScreenStatusBarFix(); // eslint-disable-line no-new
    expect(BrowserWindow).toHaveBeenCalledWith({ show: false });
  });

  test('calls setSimpleFullScreen for added windows', () => {
    const setSimpleFullScreen = jest.fn();
    mocked(BrowserWindow).mockImplementation(() => asBrowserWindow({ setSimpleFullScreen }));

    const sfsFix = new SimpleFullScreenStatusBarFix();

    const mockWindow1 = asBrowserWindow(new MockWindowEmitter(true));
    const mockWindow2 = asBrowserWindow(new MockWindowEmitter(false));

    sfsFix.addWindow(mockWindow1);
    sfsFix.addWindow(mockWindow2);

    mockWindow1.emit('focus');
    mockWindow2.emit('focus');

    expect(setSimpleFullScreen.mock.calls).toEqual([[true], [false]]);
  });
});
