// Insert emojis and speech

import { getCursorElement } from '../screen';

import nvim from '../api';

const initInsertSymbols = () => {
  const input = document.createElement('input');

  input.style.position = 'absolute';
  input.style.opacity = '0';
  input.style.left = 0;
  input.style.top = 0;
  input.style.width = '0';
  input.style.height = '0';

  (getCursorElement() || document.getElementsByTagName('body')[0]).appendChild(input);

  let insertedText = '';
  let ignoreNextInput = false;
  input.addEventListener('keydown', () => {
    ignoreNextInput = true;
  });

  input.addEventListener('input', event => {
    input.value = '';
    if (ignoreNextInput) {
      ignoreNextInput = false;
      return;
    }
    nvim.input(event.data.replace(insertedText, ''));
    if (event.isComposing) {
      insertedText = event.data;
    }
  });

  nvim.on('redraw', (args) => {
    for (let i = 0; i < args.length; i += 1) {
      const [cmd, ...props] = args[i];
      if (cmd === 'mode_change') {
        if (['insert', 'replace', 'cmdline_normal'].includes(props[0][0])) {
          input.value = '';
          input.focus();
        } else {
          input.blur();
        }
      }
    }
  });
};

export default initInsertSymbols;
