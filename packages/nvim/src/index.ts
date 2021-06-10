// Only use relative imports here because https://github.com/microsoft/TypeScript/issues/32999#issuecomment-523558695
// TODO: Bundle .d.ts or something

import Nvim from './Nvim';

export { default as startNvimProcess } from './process';

export { default as ProcNvimTransport } from './ProcNvimTransport';

export { default as RemoteNvimTransport } from './RemoteNvimTransport';

export * from './types';

export { Nvim };

export { shellEnv, nvimCommand, nvimVersion } from './utils';

export default Nvim;
