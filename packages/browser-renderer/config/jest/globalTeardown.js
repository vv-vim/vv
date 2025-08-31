/* eslint-disable no-underscore-dangle, no-undef */

import { teardownTestServer } from './testServer';

const globalTeardown = async () => {
  await teardownTestServer(globalThis.__PUPPETEER_SERVER__);
};

export default globalTeardown;
