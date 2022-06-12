import initWindowSize from 'src/main/nvim/features/windowSize';

import { EventEmitter } from 'events';
import type { Transport } from '@vvim/nvim';
import type { BrowserWindow } from 'electron';

describe('initWindowSize', () => {
  describe('set-screen-width', () => {
    const setContentSize = jest.fn();
    const getContentSize = jest.fn();
    const send = jest.fn();

    // TODO: Come up with the better way to mock BrowserWindow
    const win = ({
      setContentSize,
      getContentSize,
      getBounds: () => {
        /* empty */
      },
      setBounds: () => {
        /* empty */
      },
      isFullScreen: () => false,
      setSimpleFullScreen: () => {
        /* empty */
      },
      webContents: {
        focus: () => {
          /* empty */
        },
      },
    } as unknown) as BrowserWindow;

    let transport: Transport;

    beforeEach(() => {
      jest.clearAllMocks();
      getContentSize.mockReturnValue([100, 200]);
      transport = Object.assign(new EventEmitter(), {
        send,
      });
    });

    test('set window size on set-screen-width', () => {
      initWindowSize({ transport, win });
      transport.emit('set-screen-width', 150);
      expect(setContentSize).toHaveBeenCalledWith(150, 200);
    });

    test('set window size on set-screen-height', () => {
      initWindowSize({ transport, win });
      getContentSize.mockReturnValueOnce([100, 200]).mockReturnValueOnce([100, 250]);
      transport.emit('set-screen-height', 250);
      expect(setContentSize).toHaveBeenCalledWith(100, 250);
      expect(send).not.toHaveBeenCalledWith('force-resize');
    });

    test('send force-resize if window height is the same after resize', () => {
      initWindowSize({ transport, win });
      getContentSize.mockReturnValueOnce([100, 200]).mockReturnValueOnce([100, 200]);
      transport.emit('set-screen-height', 250);
      expect(send).toHaveBeenCalledWith('force-resize');
    });
  });
});
