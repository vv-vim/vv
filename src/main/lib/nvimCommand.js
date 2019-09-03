const nvimCommand = (env = {}) => env.VV_NVIM_COMMAND || process.env.VV_NVIM_COMMAND || 'nvim';

export default nvimCommand;
