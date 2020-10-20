/**
 * @jest-environment jsdom
 */

import initKeyboard from '@renderer/input/keyboard';

import nvim from '@renderer/nvim';

jest.mock('@renderer/nvim', () => ({ on: jest.fn(), input: jest.fn() }));
jest.mock('@renderer/screen', () => ({ getCursorElement: jest.fn() }));

describe('Keyboard input', () => {
  const simulateKeyDown = (options: KeyboardEventInit) => {
    const event = new KeyboardEvent('keydown', options);
    document.dispatchEvent(event);
  };

  beforeEach(() => {
    initKeyboard();
  });

  test('ctrl key adds <C-*> modifier', () => {
    simulateKeyDown({ key: 'a', ctrlKey: true });
    expect(nvim.input).toHaveBeenCalledWith('<C-a>');
  });
});
