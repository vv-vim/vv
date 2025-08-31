// Notarize needs APP_ID, APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, TEAM_ID env variables.
// Github repo to release is automatically detected from package.json.
// GH_TOKEN env variable is required to upload release.

// eslint-disable-next-line import/extensions
const build = require('./build.js');

const publish = {
  ...build,
  mac: {
    category: 'public.app-category.developer-tools',
    target: {
      target: 'default',
      arch: 'universal',
    },
    notarize: {
      teamId: process.env.TEAM_ID,
    },
  },
};

module.exports = publish;
