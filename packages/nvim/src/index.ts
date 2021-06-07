// Only use relative imports here because https://github.com/microsoft/TypeScript/issues/32999#issuecomment-523558695
// TODO: Bundle .d.ts or something

import Nvim from './Nvim';

import startNvimProcess from './process';

import ProcNvimTransport from './ProcNvimTransport';

export * from './types';

export { shellEnv, nvimCommand, nvimVersion } from './utils';

export { startNvimProcess, ProcNvimTransport, Nvim };

export default Nvim;
