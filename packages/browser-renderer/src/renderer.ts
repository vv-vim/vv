import Nvim from '@vvim/nvim';

import { Settings } from 'src/types';

import Transport from 'src/transport/transport';
import initScreen from 'src/screen';
import initKeyboard from 'src/input/keyboard';
import initMouse from 'src/input/mouse';
import hideMouseCursor from 'src/features/hideMouseCursor';

/**
 * Browser renderer
 */
const renderer = (): void => {
  const transport = new Transport();

  const initRenderer = (settings: Settings) => {
    const nvim = new Nvim(transport, true);
    const screen = initScreen({ nvim, settings, transport });
    initKeyboard({ nvim, screen });
    initMouse({ nvim, screen });
    hideMouseCursor();
  };

  transport.on('initRenderer', initRenderer);
};

export default renderer;
