import { Settings } from 'src/types';

import initTransport from 'src/transport/transport';
import { initNvim } from 'src/nvim';
import initScreen from 'src/screen';
import initKeyboard from 'src/input/keyboard';
import initMouse from 'src/input/mouse';
import hideMouseCursor from 'src/features/hideMouseCursor';

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
