import { argsFileNames } from '../args';

describe('argsFileNames', () => {
  test('return empty array if input is empty', () => {
    expect(argsFileNames([])).toEqual([]);
    expect(argsFileNames()).toEqual([]);
  });

  test('returns everything if there ar no params', () => {
    expect(argsFileNames(['file1', 'file2'])).toEqual(['file1', 'file2']);
  });

  test('returns everything after --', () => {
    expect(argsFileNames(['before1', 'before2', '--', 'after1', 'after2'])).toEqual([
      'after1',
      'after2',
    ]);
  });

  test('skip params started with - or +', () => {
    ['-param1', '--param2', '+cmd1'].forEach(param => {
      expect(argsFileNames([param, 'file1', 'file2'])).toEqual(['file1', 'file2']);
    });
  });

  test('skip params with argument', () => {
    ['--cmd', '-c', '-i', '-r', '-s', '-S', '-u', '--listen', '--startuptime'].forEach(param => {
      expect(argsFileNames([param, 'arg', 'file1', 'file2'])).toEqual(['file1', 'file2']);
    });
  });
});
