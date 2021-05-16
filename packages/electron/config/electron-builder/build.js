require('dotenv').config();

const { join } = require('path');
const { readFileSync } = require('fs');

const fileAssociations = require('./fileAssociations.json');

const path = require.resolve('electron');
const data = readFileSync(join(path, '..', 'package.json'), { encoding: 'utf-8' });
const electronVersion = JSON.parse(data).version;

const build = {
  appId: process.env.APPID || 'app.vvim.vv',
  productName: 'VV',
  extraMetadata: {
    name: 'VV',
  },
  files: ['build/**/*'],
  extraResources: ['bin/**/*', 'src/main/preload.js'],
  electronVersion,
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
