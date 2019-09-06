// import log from '../lib/log';

import { initNvim } from './nvim';

import initScreen from './screen';

import initKeyboard from './input/keyboard';
import initMouse from './input/mouse';
import initInsertSymbols from './input/insertSymbols';
import hideCursor from './features/hideCursor';

import { ipcRenderer } from './preloaded/electron';

const initRenderer = async (_event, settings) => {
  initNvim();
  initScreen('screen', settings);
  initKeyboard();
  initMouse();
  initInsertSymbols();
  hideCursor();
};

ipcRenderer.on('initRenderer', initRenderer);
