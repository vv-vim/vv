/**
 * Extract file names from the list of CLI arguments
 */
export const argsFileNames = (args: string[] = []) => {
  const filesSeparator = args.indexOf('--');
  if (filesSeparator !== -1) {
    return args.splice(filesSeparator).splice(1);
  }

  const argsWithParam = ['--cmd', '-c', '-i', '-r', '-s', '-S', '-u', '--listen', '--startuptime'];
  const fileNames: string[] = [];
  for (let i = args.length - 1; i >= 0; i -= 1) {
    if (['-', '+'].includes(args[i][0]) || (args[i - 1] && argsWithParam.includes(args[i - 1]))) {
      break;
    }
    // @ts-ignore
    fileNames.unshift(args.pop());
  }
  return fileNames;
};
