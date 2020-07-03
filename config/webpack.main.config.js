const merge = require('webpack-merge');
const common = require('./webpack.common.config');

const config = merge(common, {
  entry: './src/main/index.ts',
  output: {
    filename: 'main.js',
  },
  target: 'electron-main',
  node: {
    __dirname: false,
    __filename: false,
  },
});

module.exports = config;
