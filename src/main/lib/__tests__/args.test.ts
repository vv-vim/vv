import { parseArgs, joinArgs, filterArgs, argValue } from '../args';

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

describe('filterArgs', () => {
  test('returns all args if none of them are VV-specific', () => {
    expect(filterArgs(['arg1', 'arg2'])).toEqual(['arg1', 'arg2']);
  });

  test('filters out --inspect', () => {
    expect(filterArgs(['arg1', '--inspect', 'arg2'])).toEqual(['arg1', 'arg2']);
    expect(filterArgs(['--inspect', 'arg1', 'arg2'])).toEqual(['arg1', 'arg2']);
    expect(filterArgs(['arg1', 'arg2', '--inspect'])).toEqual(['arg1', 'arg2']);
    expect(filterArgs(['--inspect'])).toEqual([]);
  });

  test('filters out --open-in-project with value', () => {
    expect(filterArgs(['arg1', '--open-in-project', 'value', 'arg2'])).toEqual(['arg1', 'arg2']);
    expect(filterArgs(['--open-in-project', 'value', 'arg1', 'arg2'])).toEqual(['arg1', 'arg2']);
    expect(filterArgs(['arg1', 'arg2', '--open-in-project'])).toEqual(['arg1', 'arg2']);
    expect(filterArgs(['--open-in-project'])).toEqual([]);
    expect(filterArgs(['--open-in-project', 'value'])).toEqual([]);
  });
});

describe('argValue', () => {
  test('returns true if argument is present', () => {
    expect(argValue(['--arg1', '--arg2'], '--arg1')).toBe(true);
    expect(argValue(['--arg1', '--arg2', 'file1'], '--arg1')).toBe(true);
    expect(argValue(['--arg1', '--arg2', '--', 'file1'], '--arg1')).toBe(true);
  });

  test('returns undefined if argument is not present', () => {
    expect(argValue(['--arg1', '--arg2'], '--arg3')).toBeUndefined();
    expect(argValue(['--arg1', '--', '--arg2'], '--arg2')).toBeUndefined();
  });

  test('returns value for argument with param', () => {
    expect(argValue(['--arg1', '--cmd', 'cmdValue', '--arg2'], '--cmd')).toBe('cmdValue');
    expect(argValue(['--cmd', 'cmdValue'], '--cmd')).toBe('cmdValue');
    expect(argValue(['--cmd', 'cmdValue', 'file1'], '--cmd')).toBe('cmdValue');
    expect(argValue(['--cmd', 'cmdValue', '--', '--cmd', 'invalid'], '--cmd')).toBe('cmdValue');
  });

  test('returns undefined invalid argument with param', () => {
    expect(argValue(['--arg1', '--cmd'], '--cmd')).toBeUndefined();
    expect(argValue(['--', '--cmd', 'cmdValue'], '--cmd')).toBeUndefined();
  });
});
