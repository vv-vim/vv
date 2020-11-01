/**
 * @jest-environment jsdom
 */

import initKeyboard from '@renderer/input/keyboard';

import nvim from '@renderer/nvim';

jest.mock('@renderer/nvim', () => ({ on: jest.fn(), input: jest.fn() }));

describe('Keyboard input', () => {
  const screen = {
    getCursorElement: jest.fn<HTMLDivElement, void[]>(),
  };

  const simulateKeyDown = (options: KeyboardEventInit) => {
    const event = new KeyboardEvent('keydown', options);
    document.dispatchEvent(event);
  };

  beforeEach(() => {
    initKeyboard(screen);
  });

  test('ctrl key adds <C-*> modifier', () => {
    simulateKeyDown({ key: 'a', ctrlKey: true });
    expect(nvim.input).toHaveBeenCalledWith('<C-a>');
  });
});
