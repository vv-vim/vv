const merge = require('webpack-merge');
const common = require('./webpack.common.config');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const config = merge(common, {
  entry: './src/renderer/index.js',
  output: {
    filename: 'renderer.js',
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html',
    }),
  ],
  target: 'electron-renderer',
  devtool: 'inline-source-map',
  devServer: {
    compress: true,
    port: 3000,
  },
});

module.exports = config;
