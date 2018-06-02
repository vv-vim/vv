// :help keyCode
const specialKey = ({ key }) =>
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
  }[key]);

const skip = key =>
  ({
    Shift: true,
    Control: true,
    Alt: true,
    Meta: true,
  }[key]);

export const modifierPrefix = ({ metaKey, altKey, ctrlKey }) =>
  `${metaKey ? 'D-' : ''}${altKey ? 'A-' : ''}${ctrlKey ? 'C-' : ''}`;

export const shiftPrefix = ({ shiftKey }) => (shiftKey ? 'S-' : '');

const filterResult = result =>
  !{
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
  }[result] && result;

// https://github.com/rhysd/NyaoVim/issues/87
const replaceResult = result => ({
  '<C-6>': '<C-^>',
  '<C-->': '<C-_>',
  '<C-2>': '<C-@>',
}[result] || result);

const eventKeyCode = (event) => {
  // console.log(event);
  const { key } = event;

  if (skip(key)) {
    return null;
  }
  const modifier = modifierPrefix(event);
  const shift = shiftPrefix(event);
  const special = specialKey(event);

  const keyCode = special || key;

  const result =
    modifier || (special && special !== '<lt>')
      ? `<${modifier}${shift}${keyCode}>`
      : keyCode;

  return replaceResult(filterResult(result));
};

let nvim;

const handleKeydown = (event) => {
  const key = eventKeyCode(event);
  if (key) nvim.input(key);
};

const initKeyboard = (newNvim) => {
  nvim = newNvim;
  document.addEventListener('keydown', handleKeydown);
};

export default initKeyboard;
