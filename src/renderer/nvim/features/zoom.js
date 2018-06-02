const { ipcRenderer } = global.require('electron');
let nvim;

const handleZoom = (sender, level) => {
  nvim.command(`VVset fontsize${level > 0 ? '+' : '-'}=${Math.abs(level)}`);
};

const initFullScreen = (newNvim) => {
  nvim = newNvim;
  ipcRenderer.on('zoom', handleZoom);
};

export default initFullScreen;
