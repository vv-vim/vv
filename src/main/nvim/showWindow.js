import debounce from 'lodash/debounce';

const showWindow = ({ win, nvim }) => {
  let showWindowTimeout = null;

  const debouncedShowWindow = debounce(() => {
    nvim.off('redraw', debouncedShowWindow);
    showWindow();
  }, 50);

  const showWindow = () => {
    if (!win.isVisible()){
      if (showWindowTimeout) clearTimeout(showWindowTimeout);
      win.show();
      nvim.command('doautocmd <nomodeline> GUIEnter');
      // store.set('initialSettings', initialSettings);
      // window.addEventListener('resize', debouncedResize);
    }
  };

  nvim.on('vv:vim_enter', () => {
    nvim.on('redraw', () => { console.log('redraw') });
    nvim.on('redraw', debouncedShowWindow);
  });

  // If nvim has startup errors or swapfile warning it will not trigger VimEnter
  // until user action. If that happens, show window anyway.
  showWindowTimeout = setTimeout(showWindow, 2000);
};

export default showWindow;
