const nvimCommand = (env: NodeJS.ProcessEnv = {}): string =>
  env.VV_NVIM_COMMAND || process.env.VV_NVIM_COMMAND || 'nvim';

export default nvimCommand;
