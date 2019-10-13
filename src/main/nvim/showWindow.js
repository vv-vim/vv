import debounce from 'lodash/debounce';

const showWindow = ({ win, nvim }) => {
  const showWindowTimeout = null;
  let isVisible = false;

  const doShowWindow = () => {
    if (showWindowTimeout) clearTimeout(showWindowTimeout);
    if (!isVisible) {
      win.show();
      nvim.command('doautocmd GUIEnter');
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
};

export default showWindow;
