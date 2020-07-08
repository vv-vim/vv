import { parseArgs, joinArgs } from '../args';

describe('parseArgs', () => {
  test('return empty array if input is empty', () => {
    expect(parseArgs([])).toEqual({ args: [], files: [] });
    expect(parseArgs()).toEqual({ args: [], files: [] });
  });

  test('returns everything if there ar no params', () => {
    expect(parseArgs(['file1', 'file2'])).toEqual({
      args: [],
      files: ['file1', 'file2'],
    });
  });

  test('returns everything after --', () => {
    expect(parseArgs(['before1', 'before2', '--', 'after1', 'after2'])).toEqual({
      args: ['before1', 'before2'],
      files: ['after1', 'after2'],
    });
  });

  test('skip params started with - or +', () => {
    ['-param1', '--param2', '+cmd1'].forEach((param) => {
      expect(parseArgs([param, 'file1', 'file2'])).toEqual({
        args: [param],
        files: ['file1', 'file2'],
      });
    });
  });

  test('skip params with argument', () => {
    ['--cmd', '-c', '-i', '-r', '-s', '-S', '-u', '--listen', '--startuptime'].forEach((param) => {
      expect(parseArgs([param, 'arg', 'file1', 'file2'])).toEqual({
        args: [param, 'arg'],
        files: ['file1', 'file2'],
      });
    });
  });

  test('does not mutate arguments', () => {
    const args = ['arg1', 'arg2'];
    parseArgs(args);
    expect(args).toEqual(['arg1', 'arg2']);
  });
});

describe('joinArgs', () => {
  test('joins args and files arrays and put -- between them', () => {
    expect(joinArgs({ args: ['arg1', 'arg2'], files: ['file1', 'file2'] })).toEqual([
      'arg1',
      'arg2',
      '--',
      'file1',
      'file2',
    ]);
  });

  test("don't add -- if args is empty", () => {
    expect(joinArgs({ args: [], files: ['file1', 'file2'] })).toEqual(['file1', 'file2']);
  });

  test("don't add -- if files is empty", () => {
    expect(joinArgs({ args: ['arg1'], files: [] })).toEqual(['arg1']);
  });
});
