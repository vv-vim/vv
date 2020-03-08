import getColor from '../getColor';

describe('getColor', () => {
  test('0 is black', () => {
    expect(getColor(0)).toBe('rgb(0,0,0)');
  });

  test('0xffffff is white', () => {
    expect(getColor(0xffffff)).toBe('rgb(255,255,255)');
  });

  test('0x333333 is gray', () => {
    expect(getColor(0x333333)).toBe('rgb(51,51,51)');
  });
});
