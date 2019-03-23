const { ipcRenderer } = global.require('electron');
let nvim;

// https://neovim.io/doc/user/eval.html#mode()
const handlePaste = async event => {
  event.preventDefault();
  event.stopPropagation();
  const clipboardText = event.clipboardData.getData('text').replace(/</g, '<lt>');
  const { mode } = await nvim.mode;
  const shortMode = mode.replace('CTRL-', '')[0];
  if (shortMode === 'i') {
    await nvim.command('set paste');
    await nvim.input(clipboardText);
    await nvim.command('set nopaste');
  } else if (['n', 'v', 'V', 's', 'S'].includes(shortMode)) {
    nvim.input('"*p');
  } else {
    nvim.input(clipboardText);
  }
};

const handleCopy = async event => {
  event.preventDefault();
  event.stopPropagation();
  const { mode } = await nvim.mode;
  if (mode === 'v' || mode === 'V') {
    nvim.input('"*y');
  }
};

const handleSelectAll = () => {
  nvim.input('ggVG');
};

const initCopyPaste = newNvim => {
  nvim = newNvim;
  document.addEventListener('copy', handleCopy);
  document.addEventListener('paste', handlePaste);
  ipcRenderer.on('selectAll', handleSelectAll);
};

export default initCopyPaste;
