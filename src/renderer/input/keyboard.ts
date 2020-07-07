import nvim from '../nvim';
import { getCursorElement } from '../screen';

// :help keyCode
const specialKey = ({ key, code }: KeyboardEvent): string =>
  (({
    Insert: 'Insert',
    Numpad0: 'k0',
    Numpad1: 'k1',
    Numpad2: 'k2',
    Numpad3: 'k3',
    Numpad4: 'k4',
    Numpad5: 'k5',
    Numpad6: 'k6',
    Numpad7: 'k7',
    Numpad8: 'k8',
    Numpad9: 'k9',
    NumpadAdd: 'kPlus',
    NumpadSubtract: 'kMinus',
    NumpadMultiply: 'kMultiply',
    NumpadDivide: 'kDivide',
    NumpadEnter: 'kEnter',
    NumpadDecimal: 'kPoint',
  } as Record<string, string>)[code] ||
  ({
    Escape: 'Esc',
    Backspace: 'BS',
    Delete: 'Del',
    Enter: 'CR',
    Tab: 'Tab',
    '<': '<lt>',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    PageUp: 'PageUp',
    PageDown: 'PageDown',
    Home: 'Home',
    End: 'End',
    F1: 'F1',
    F2: 'F2',
    F3: 'F3',
    F4: 'F4',
    F5: 'F5',
    F6: 'F6',
    F7: 'F7',
    F8: 'F8',
    F9: 'F9',
    F10: 'F10',
    F11: 'F11',
    F12: 'F12',
    '\\': 'Bslash',
    '|': 'Bar',
  } as Record<string, string>)[key]);

const skip = (key: string) =>
  (({
    Shift: true,
    Control: true,
    Alt: true,
    Meta: true,
    CapsLock: true,
    Dead: true,
  } as Record<string, boolean>)[key]);

export const modifierPrefix = ({ metaKey, altKey, ctrlKey }: KeyboardEvent | MouseEvent): string =>
  `${metaKey ? 'D-' : ''}${altKey ? 'A-' : ''}${ctrlKey ? 'C-' : ''}`;

export const shiftPrefix = ({ shiftKey }: KeyboardEvent): string => (shiftKey ? 'S-' : '');

// Filter hotkeys from menu.
const filterResult = (result: string) =>
  !({
    '<D-c>': true, // Cmd+C
    '<D-v>': true, // Cmd+V
    '<D-a>': true, // Cmd+A: "Select all" menu item
    '<D-=>': true, // Cmd+Plus: "Zoom In" menu item
    '<D-->': true, // Cmd+-: "Zoom Out" menu item
    '<D-0>': true, // Cmd+0: "Actual Size" menu item
    '<D-C-f>': true, // Cmd+Ctrl+F: "Toggle Full Screen" menu item
    '<D-m>': true, // Cmd+M: "Minimize" menu item
    '<D-h>': true, // Cmd+H: Hide window
    '<D-q>': true, // Cmd+Q: Quit
    '<D-o>': true, // Cmd+O: Open file
    '<D-n>': true, // Cmd+N: New window
    '<D-w>': true, // Cmd+W: Close window
  } as Record<string, boolean>)[result] && result;

// https://github.com/rhysd/NyaoVim/issues/87
const replaceResult = (result: string) =>
  (({
    '<C-6>': '<C-^>',
    '<C-->': '<C-_>',
    '<C-2>': '<C-@>',
  } as Record<string, string>)[result] || result);

const eventKeyCode = (event: KeyboardEvent): string | null => {
  const { key } = event;

  if (skip(key)) return null;

  const modifier = modifierPrefix(event);
  const shift = shiftPrefix(event);
  const special = specialKey(event);

  const keyCode = special || key;

  const result =
    modifier || (special && special !== '<lt>') ? `<${modifier}${shift}${keyCode}>` : keyCode;

  const filteredResult = filterResult(result);
  if (!filteredResult) {
    return null;
  }

  return replaceResult(filteredResult);
};

let disableNextInput = false;
let inputKey: string | null = null;
let isComposing = false;
let compositionValue = null;

const handleKeydown = async (event: KeyboardEvent) => {
  disableNextInput = true;
  if (!isComposing) {
    inputKey = eventKeyCode(event);
    if (inputKey) nvim.input(inputKey);
  }
};

// Non-keyboard input. For example insert emoji.
const handleInput = (event: InputEvent) => {
  if (disableNextInput || isComposing) {
    disableNextInput = false;
    return;
  }
  nvim.input(event.data);
};

// Composition input for logograms or diacritical signs. Also works for speech input.
const handleCompositionStart = () => {
  isComposing = true;
  compositionValue = inputKey || '';
};

const handleCompositionEnd = () => {
  isComposing = false;
};

const handleCompositionUpdate = (event: CompositionEvent) => {
  nvim.input(`${'<BS>'.repeat(compositionValue.length)}${event.data}`);
  compositionValue = event.data;
};

const initKeyboard = (): void => {
  const input = document.createElement('input');

  input.style.position = 'absolute';
  input.style.opacity = '0';
  input.style.left = '0';
  input.style.top = '0';
  input.style.width = '0';
  input.style.height = '0';

  (getCursorElement() || document.getElementsByTagName('body')[0]).appendChild(input);

  document.addEventListener('keydown', handleKeydown);

  // @ts-ignore TODO
  input.addEventListener('input', handleInput);
  input.addEventListener('compositionstart', handleCompositionStart);
  // @ts-ignore TODO
  input.addEventListener('compositionupdate', handleCompositionUpdate);
  input.addEventListener('compositionend', handleCompositionEnd);

  // Enable composition input only for insert and command-line modes. Enabling if for other modes
  // is tricky. `preventDefault` does not work for compositionstart, so we need to blur/focus input
  // element for this.
  nvim.on('redraw', (args: string[]) => {
    for (let i = 0, { length } = args; i < length; i += 1) {
      const [cmd, ...params] = args[i];
      if (cmd === 'mode_change') {
        // https://github.com/neovim/neovim/blob/master/src/nvim/cursor_shape.c#L18
        if (['insert', 'cmdline_normal'].includes(params[0][0])) {
          input.focus();
        } else {
          input.blur();
        }
      }
    }
  });
};

export default initKeyboard;
