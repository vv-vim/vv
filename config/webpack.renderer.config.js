const merge = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const common = require('./webpack.common.config');

const config = merge(common, {
  entry: './src/renderer/index.ts',
  output: {
    filename: 'renderer.js',
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html',
    }),
  ],
  target: 'web',
  devtool: 'inline-source-map',
  devServer: {
    compress: true,
    port: 3000,
  },
});

module.exports = config;
