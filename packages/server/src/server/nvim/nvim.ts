// TODO
// import quit from '@main/nvim/features/quit';
// import windowTitle from '@main/nvim/features/windowTitle';
// import zoom from '@main/nvim/features/zoom';
// import windowSize from '@main/nvim/features/windowSize';
// import focusAutocmd from '@main/nvim/features/focusAutocmd';

import initSettings from 'src/server/nvim/settings';

import Nvim, { startNvimProcess, ProcNvimTransport } from '@vvim/nvim';

import type { Transport, Args } from 'src/server/transport/types';

const initNvim = ({
  args,
  cwd,
  transport,
}: {
  args?: string[];
  cwd?: string;
  transport: Transport;
}): void => {
  const proc = startNvimProcess({ args, cwd });
  const nvimTransport = new ProcNvimTransport(proc);
  const nvim = new Nvim(nvimTransport);

  nvimTransport.read((data: Args) => transport.send('nvim-data', data));
  nvimTransport.onClose(() => transport.send('nvim-close'));
  transport.on('nvim-send', (payload: Parameters<ProcNvimTransport['write']>) =>
    nvimTransport.write(...payload),
  );

  initSettings({ nvim, args, transport });

  // TODO
  // nvim.on('disconnect', () => {});
};

export default initNvim;
