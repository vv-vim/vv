require('dotenv').config();
const fileAssociations = require('./fileAssociations.json');

const build = {
  appId: process.env.APPID || 'app.vvim.vv',
  files: ['build/**/*'],
  extraResources: ['bin/**/*', 'src/main/preload.js'],
  directories: {
    buildResources: 'assets',
  },
  fileAssociations: [
    ...fileAssociations,
    {
      name: 'Document',
      role: 'Editor',
      ext: '*',
      icon: 'generic.icns',
    },
  ],
  mac: {
    category: 'public.app-category.developer-tools',
    target: 'dir',
  },
};

module.exports = build;
