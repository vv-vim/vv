// Insert emojis and speech

import { getCursorElement } from '../screen';

import nvim from '../nvim';

const initInsertSymbols = () => {
  const input = document.createElement('input');

  input.style.position = 'absolute';
  input.style.opacity = '0';
  input.style.left = 0;
  input.style.top = 0;
  input.style.width = '0';
  input.style.height = '0';

  (getCursorElement() || document.getElementsByTagName('body')[0]).appendChild(input);

  let composition = false;
  let compositionLength = 0;

  let insertedText = '';
  let ignoreNextInput = false;
  input.addEventListener('keydown', () => {
    ignoreNextInput = true;
  });

  input.addEventListener('input', event => {
    if (!composition) {
      input.value = '';
      if (ignoreNextInput) {
        ignoreNextInput = false;
        return;
      }
      nvim.input(event.data.replace(insertedText, ''));
      if (event.isComposing) {
        insertedText = event.data;
      }
    }
  });

  // Composition symbols, for example Alt+i, then u will make û
  input.addEventListener('compositionstart', () => {
    composition = true;
    compositionLength = 0;
  });

  input.addEventListener('compositionupdate', event => {
    if (compositionLength > 0) {
      nvim.input('<BS>'.repeat(compositionLength));
    }
    compositionLength = event.data.length;
    nvim.input(event.data);
  });

  input.addEventListener('compositionend', () => {
    composition = false;
  });

  nvim.on('redraw', args => {
    for (let i = 0; i < args.length; i += 1) {
      const [cmd, ...props] = args[i];
      if (cmd === 'mode_change') {
        // TODO: check other modes https://github.com/neovim/neovim/blob/master/src/nvim/cursor_shape.c#L18
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
