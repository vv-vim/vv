import { Transport } from 'src/server/transport/types';

// TODO
// import quit from '@main/nvim/features/quit';
// import windowTitle from '@main/nvim/features/windowTitle';
// import zoom from '@main/nvim/features/zoom';
// import reloadChanged from '@main/nvim/features/reloadChanged';
// import windowSize from '@main/nvim/features/windowSize';
// import focusAutocmd from '@main/nvim/features/focusAutocmd';

import initSettings from 'src/server/nvim/settings';

import nvimApi from 'src/server/nvim/api';

const initNvim = ({
  args,
  cwd,
  transport,
}: {
  args?: string[];
  cwd?: string;
  transport: Transport;
}): void => {
  const nvim = nvimApi({
    args,
    cwd,
  });

  nvim.on('data', (data) => transport.send('nvim-data', data));

  transport.on('nvim-send', (payload) => {
    // @ts-expect-error FIXME
    nvim.send(...payload);
  });

  initSettings({ nvim, args, transport });

  // TODO
  // nvim.on('disconnect', () => {});
};

export default initNvim;
