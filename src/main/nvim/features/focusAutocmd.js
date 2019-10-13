const focusAutocmd = ({ win, nvim }) => {
  win.on('focus', () => {
    nvim.command('doautocmd FocusGained');
  });

  win.on('blur', () => {
    nvim.command('doautocmd FocusLost');
  });
};

export default focusAutocmd;
