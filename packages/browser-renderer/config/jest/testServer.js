import { setup, teardown } from 'jest-dev-server';

// TODO: make it configurable
export const PORT = 3001;

export const setupTestServer = async () => {
  await setup({
    command: `PORT=${PORT} yarn start:server -u NONE`,
    launchTimeout: 10000,
    port: PORT,
  });
};

export const teardownTestServer = teardown;
