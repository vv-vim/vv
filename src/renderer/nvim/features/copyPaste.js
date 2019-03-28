import { ipcRenderer } from 'electron';

import nvim from '../api';

// Fetch current mode from nvim, leaves only first letter to match groups of modes.
export const shortMode = async () => {
  const { mode } = await nvim.getMode();
  return mode.replace('CTRL-', '')[0];
};

// https://neovim.io/doc/user/eval.html#mode()
const handlePaste = async event => {
  event.preventDefault();
  event.stopPropagation();
  const clipboardText = event.clipboardData.getData('text').replace(/</g, '<lt>');

  const mode = await shortMode();
  if (mode === 'i') {
    await nvim.command('set paste');
    await nvim.input(clipboardText);
    await nvim.command('set nopaste');
  } else if (['n', 'v', 'V', 's', 'S'].includes(mode)) {
    nvim.input('"*p');
  } else {
    nvim.input(clipboardText);
  }
};

const handleCopy = async event => {
  event.preventDefault();
  event.stopPropagation();
  const mode = await shortMode();
  if (mode === 'v' || mode === 'V') {
    nvim.input('"*y');
  }
};

const handleSelectAll = () => {
  nvim.input('ggVG');
};

const initCopyPaste = () => {
  document.addEventListener('copy', handleCopy);
  document.addEventListener('paste', handlePaste);
  ipcRenderer.on('selectAll', handleSelectAll);
};

export default initCopyPaste;
