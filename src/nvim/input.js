const specialKey = ({ key }) =>
  ({
    Escape: 'Esc',
    Backspace: 'BS',
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

const modifierPrefix = ({
  metaKey, altKey, ctrlKey,
}) => `${metaKey ? 'D-' : ''}${altKey ? 'A-' : ''}${ctrlKey ? 'C-' : ''}`;

const shiftPrefix = ({ shiftKey }) => (shiftKey ? 'S-' : '');

const filterResult = result => (!{
  '<D-v>': true,
  '<D-c>': true,
}[result] && result);

export const eventKeyCode = (event) => {
  // console.log(event);
  const { key } = event;

  if (skip(key)) {
    return null;
  }
  const modifier = modifierPrefix(event);
  const shift = shiftPrefix(event);
  const special = specialKey(event);

  const keyCode = special || key;

  const result = (modifier || (special && special !== '<lt>')) ?
    `<${modifier}${shift}${keyCode}>` :
    keyCode;

  return filterResult(result);
};
