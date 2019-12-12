const build = require('./build.js');

const publish = {
  ...build,
  mac: {
    category: 'public.app-category.developer-tools',
    target: 'default',
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'config/electron-builder/entitlements.mac.plist',
    entitlementsInherit: 'config/electron-builder/entitlements.mac.plist',
  },
  dmg: {
    sign: false,
  },
  afterSign: 'scripts/notarize.js',
};

module.exports = publish;
