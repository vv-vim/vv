import { nvim } from '../api';

const { remote: { getCurrentWindow }, ipcRenderer } = global.require('electron');

const currentWindow = getCurrentWindow();

let simpleFullScreen = true;

const boolValue = value => !!parseInt(value, 10);

const handleSet = {
  fullscreen: (value) => {
    if (simpleFullScreen) {
      currentWindow.setSimpleFullScreen(boolValue(value));
    } else {
      currentWindow.setFullScreen(boolValue(value));
    }
    if (!boolValue(value)) {
      currentWindow.webContents.send('leave-full-screen');
    }
    currentWindow.webContents.focus();
  },
  simplefullscreen: (value) => {
    simpleFullScreen = boolValue(value);
    if (simpleFullScreen && currentWindow.isFullScreen()) {
      currentWindow.setFullScreen(false);
      currentWindow.setSimpleFullScreen(true);
      currentWindow.webContents.focus();
    } else if (!simpleFullScreen && currentWindow.isSimpleFullScreen()) {
      currentWindow.setSimpleFullScreen(false);
      currentWindow.setFullScreenable(true);
      currentWindow.setFullScreen(true);
      currentWindow.webContents.focus();
    }
    currentWindow.setFullScreenable(!simpleFullScreen);
  },
};

const handleToggleFullScreen = () => {
  nvim().command('VVset fullscreen!');
};

const initFullScreen = () => {
  ipcRenderer.on('toggleFullScreen', handleToggleFullScreen);
  return handleSet;
};

export default initFullScreen;
