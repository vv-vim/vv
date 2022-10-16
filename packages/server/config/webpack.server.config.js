const { merge } = require('webpack-merge');
const common = require('./webpack.common.config');

const config = merge(common, {
  entry: './src/server/index.ts',
  target: 'node',
  output: {
    filename: 'server.js',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
});

module.exports = config;
