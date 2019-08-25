import { ipcRenderer } from 'electron';

import nvim from '../api';

const handleZoom = (_sender, level) => {
  nvim.command(`VVset fontsize${level > 0 ? '+' : '-'}=${Math.abs(level)}`);
};

const initZoom = () => {
  ipcRenderer.on('zoom', handleZoom);
};

export default initZoom;
