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

  const argsWithParam = ['--cmd', '-c', '-i', '-r', '-s', '-S', '-u', '--listen', '--startuptime'];
  const files: string[] = [];
  for (let i = args.length - 1; i >= 0; i -= 1) {
    if (['-', '+'].includes(args[i][0]) || (args[i - 1] && argsWithParam.includes(args[i - 1]))) {
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
