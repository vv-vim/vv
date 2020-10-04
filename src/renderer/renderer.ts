// import log from '@lib/log';

import { Settings } from '@main/lib/store';

import initTransport from '@renderer/transport/transport';
import { initNvim } from '@renderer/nvim';
import initScreen from '@renderer/screen';
import initKeyboard from '@renderer/input/keyboard';
import initMouse from '@renderer/input/mouse';
import hideMouseCursor from '@renderer/features/hideMouseCursor';

const renderer = (): void => {
  const transport = initTransport();

  const initRenderer = (settings: Settings) => {
    initNvim(transport);
    initScreen({ settings, transport });
    initKeyboard();
    initMouse();
    hideMouseCursor();
  };

  transport.on('initRenderer', initRenderer);
};

export default renderer;
