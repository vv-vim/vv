const { remote: { getCurrentWindow }, ipcRenderer } = global.require('electron');

let nvim;
const currentWindow = getCurrentWindow();

const handleCloseWindow = () => {
  nvim.command('VVcloseWindow');
};

const initCloseWindow = (newNvim) => {
  nvim = newNvim;

  nvim.on('notification', (method) => {
    if (method === 'vv:close_window') {
      currentWindow.webContents.send('quit');
    }
  });
  nvim.subscribe('vv:close_window');

  ipcRenderer.on('closeWindow', handleCloseWindow);
};

export default initCloseWindow;
