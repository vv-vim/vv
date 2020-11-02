const ARGS_WITH_PARAM = [
  '--cmd',
  '-c',
  '-i',
  '-r',
  '-s',
  '-S',
  '-u',
  '--listen',
  '--startuptime',
  '--open-in-project',
];

/**
 * Args specific to VV
 */
const VV_ARGS = ['--inspect', '--open-in-project'];

/**
 * Parse CLI args and return the list of files and arguments.
 */
export const parseArgs = (
  originalArgs: string[] = [],
): {
  args: string[];
  files: string[];
} => {
  const args = [...originalArgs];

  const filesSeparator = args.indexOf('--');
  if (filesSeparator !== -1) {
    return {
      args: args.slice(0, filesSeparator),
      files: args.slice(filesSeparator + 1),
    };
  }

  const files: string[] = [];
  for (let i = args.length - 1; i >= 0; i -= 1) {
    if (['-', '+'].includes(args[i][0]) || (args[i - 1] && ARGS_WITH_PARAM.includes(args[i - 1]))) {
      break;
    }
    files.unshift(args.pop() as string);
  }
  return { args, files };
};

/**
 * Join previously parsed args.
 */
export const joinArgs = ({ args, files }: { args: string[]; files: string[] }): string[] => {
  if (args.length === 0) {
    return files;
  }
  if (files.length === 0) {
    return args;
  }
  return [...args, '--', ...files];
};

/**
 * Argument value.
 * Returns true for argument that does not require argument if it is present.
 * Returns argument param for argumenst with params (for example --cmd).
 * Undefined if param is not present.
 */
export const argValue = (originalArgs: string[], argName: string): string | true | undefined => {
  const { args } = parseArgs(originalArgs);
  const index = args.indexOf(argName);
  if (index === -1) {
    return undefined;
  }
  if (ARGS_WITH_PARAM.includes(argName)) {
    return args[index + 1];
  }
  return true;
};

/**
 * Remove VV specific arguments not supported by nvim
 */
export const filterArgs = (args: string[]): string[] =>
  args.reduce<string[]>((result, a, i) => {
    if (VV_ARGS.includes(a)) {
      return result;
    }
    if (args[i - 1] && VV_ARGS.includes(args[i - 1]) && ARGS_WITH_PARAM.includes(args[i - 1])) {
      return result;
    }
    return [...result, a];
  }, []);

/**
 * Get CLI arguments
 */
export const cliArgs = (args?: string[]): string[] | undefined => (args || process.argv).slice(2);
