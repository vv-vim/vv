import { Settings } from '@renderer/types';

import initTransport from '@renderer/transport/transport';
import { initNvim } from '@renderer/nvim';
import initScreen from '@renderer/screen';
import initKeyboard from '@renderer/input/keyboard';
import initMouse from '@renderer/input/mouse';
import hideMouseCursor from '@renderer/features/hideMouseCursor';

const renderer = (): void => {
  const transport = initTransport();

  const initRenderer = (settings: Settings) => {
    const nvim = initNvim(transport);
    const screen = initScreen({ settings, transport });
    initKeyboard({ nvim, screen });
    initMouse(screen);
    hideMouseCursor();
  };

  transport.on('initRenderer', initRenderer);
};

export default renderer;
