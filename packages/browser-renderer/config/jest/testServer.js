import { setup, teardown } from 'jest-dev-server';

// TODO: make it configurable
export const PORT = 3001;

export async function setupTestServer() {
  const server = await setup({
    command: `PORT=${PORT} yarn start:server -u NONE`,
    launchTimeout: 10000,
    port: PORT,
    usedPortAction: 'kill',
  });
  return server;
}

export async function teardownTestServer(server) {
  if (server) {
    await teardown(server);
  }
}
