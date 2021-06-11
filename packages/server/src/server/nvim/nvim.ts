// TODO
// import quit from '@main/nvim/features/quit';
// import windowTitle from '@main/nvim/features/windowTitle';
// import zoom from '@main/nvim/features/zoom';
// import windowSize from '@main/nvim/features/windowSize';
// import focusAutocmd from '@main/nvim/features/focusAutocmd';

import initSettings from 'src/server/nvim/settings';

import Nvim, { startNvimProcess, ProcNvimTransport, RemoteTransport } from '@vvim/nvim';

const initNvim = ({
  args,
  cwd,
  transport,
}: {
  args?: string[];
  cwd?: string;
  transport: RemoteTransport;
}): void => {
  const proc = startNvimProcess({ args, cwd });
  const nvimTransport = new ProcNvimTransport(proc, transport);
  const nvim = new Nvim(nvimTransport);

  initSettings({ nvim, args, transport });

  // TODO
  // nvim.on('disconnect', () => {});
};

export default initNvim;
