const fileAssociations = require('./fileAssociations.json');

const build = {
  appId: 'app.vvim.vv',
  mac: {
    category: 'public.app-category.developer-tools',
  },
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
};

module.exports = build;
