/* eslint-disable no-underscore-dangle, no-undef */

import { setupTestServer } from './testServer';

const globalSetup = async () => {
  globalThis.__PUPPETEER_SERVER__ = await setupTestServer();
};

export default globalSetup;
