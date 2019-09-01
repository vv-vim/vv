import debounce from 'lodash/debounce';

const showWindow = ({ win, nvim }) => {
  let showWindowTimeout = null;
  let isVisible = false;

  const debouncedShowWindow = debounce(() => {
    nvim.off('redraw', debouncedShowWindow);
    showWindow();
  }, 10);

  const showWindow = () => {
    if (showWindowTimeout) clearTimeout(showWindowTimeout);
    if (!isVisible){
      win.show();
      nvim.command('doautocmd <nomodeline> GUIEnter');
      isVisible = true;
    }
  };

  nvim.on('vv:vim_enter', () => {
    nvim.on('redraw', debouncedShowWindow);
  });

  // If nvim has startup errors or swapfile warning it will not trigger VimEnter
  // until user action. If that happens, show window anyway.
  showWindowTimeout = setTimeout(showWindow, 2000);
};

export default showWindow;
