// import log from '../lib/log';

import { initNvim } from './nvim';

import initScreen from './screen';

import initKeyboard from './input/keyboard';
import initMouse from './input/mouse';
import hideMouseCursor from './features/hideMouseCursor';

import { ipcRenderer } from './preloaded/electron';

const initRenderer = (_event, settings) => {
  initNvim();
  initScreen('screen', settings);
  initKeyboard();
  initMouse();
  hideMouseCursor();
};

ipcRenderer.on('initRenderer', initRenderer);
