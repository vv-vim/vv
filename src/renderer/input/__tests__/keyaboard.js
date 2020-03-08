/**
 * @jest-environment jsdom
 */

import initKeyboard from '../keyboard';

import nvim from '../../nvim';

jest.mock('../../nvim', () => ({ on: jest.fn(), input: jest.fn() }));
jest.mock('../../screen', () => ({ getCursorElement: jest.fn() }));

describe('Keyboard input', () => {
  const simulateKeyDown = options => {
    const event = new KeyboardEvent('keydown', options);
    document.dispatchEvent(event);
  };

  beforeEach(() => {
    initKeyboard();
  });

  test('test', () => {
    simulateKeyDown({ key: 'a', ctrlKey: true });
    expect(nvim.input).toHaveBeenCalledWith('<C-a>');
  });
});
