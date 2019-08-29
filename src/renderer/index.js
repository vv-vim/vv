// import log from '../lib/log';

import { initNvim } from './nvim/nvim';

import initScreen from './nvim/screen';

import initKeyboard from './nvim/input/keyboard';
import initMouse from './nvim/input/mouse';
import initInsertSymbols from './nvim/input/insertSymbols';

import { ipcRenderer } from './preloaded/electron';

const initRenderer = async (_event, settings) => {
  initNvim();
  initScreen('screen', settings);
  initKeyboard();
  initMouse();
  initInsertSymbols();
};

ipcRenderer.on('initRenderer', initRenderer);
