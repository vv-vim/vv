import backgroundColor from 'src/main/nvim/features/backrdoundColor';

import type { RemoteTransport } from '@vvim/nvim';
import type { BrowserWindow } from 'electron';

describe('backrdoundColor', () => {
  const setBackgroundColor = jest.fn();
  let emitSetBackgroundColor: (color: string) => void;

  const transport = ({
    on: (event: string, callback: (...args: any[]) => void) => {
      if (event === 'set-background-color') {
        emitSetBackgroundColor = callback;
      }
    },
  } as unknown) as RemoteTransport;

  const win = ({
    setBackgroundColor,
  } as unknown) as BrowserWindow;

  test('set window background color on `set-backround-color` event', () => {
    backgroundColor({ transport, win });
    emitSetBackgroundColor('red');
    expect(setBackgroundColor).toHaveBeenCalledWith('red');
  });
});
