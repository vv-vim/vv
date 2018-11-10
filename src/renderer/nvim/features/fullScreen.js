const { remote: { getCurrentWindow }, ipcRenderer } = global.require('electron');

let nvim;
const currentWindow = getCurrentWindow();

let simpleFullScreen = true;

const boolValue = value => !!parseInt(value, 10);

const handleSet = {
  fullscreen: (value) => {
    setTimeout(() => {
      if (simpleFullScreen) {
        currentWindow.setSimpleFullScreen(boolValue(value));
      } else {
        currentWindow.setFullScreen(boolValue(value));
      }
      if (!boolValue(value)) {
        currentWindow.webContents.send('leave-full-screen');
      }
      currentWindow.webContents.focus();
    }, 1);
  },
  simplefullscreen: (value) => {
    setTimeout(() => {
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
    }, 1);
  },
};

const handleNotification = async (method, args) => {
  if (method === 'vv:set') {
    const [option, ...props] = args;
    if (handleSet[option]) {
      handleSet[option](...props);
    }
  }
};

const handleToggleFullScreen = () => {
  nvim.command('VVset fullscreen!');
};

const initFullScreen = (newNvim) => {
  nvim = newNvim;
  ipcRenderer.on('toggleFullScreen', handleToggleFullScreen);
  nvim.on('notification', (method, args) => {
    handleNotification(method, args);
  });
};

export default initFullScreen;
