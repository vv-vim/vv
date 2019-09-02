import debounce from 'lodash/debounce';

const showWindow = ({ win, nvim }) => {
  let showWindowTimeout = null;
  let isVisible = false;

  const doShowWindow = () => {
    if (showWindowTimeout) clearTimeout(showWindowTimeout);
    if (!isVisible) {
      win.show();
      nvim.command('doautocmd <nomodeline> GUIEnter');
      isVisible = true;
    }
  };

  const debouncedShowWindow = debounce(() => {
    nvim.off('redraw', debouncedShowWindow);
    doShowWindow();
  }, 10);

  nvim.on('vv:vim_enter', () => {
    nvim.on('redraw', debouncedShowWindow);
  });

  // If nvim has startup errors or swapfile warning it will not trigger VimEnter
  // until user action. If that happens, show window anyway.
  showWindowTimeout = setTimeout(doShowWindow, 2000);
};

export default showWindow;
