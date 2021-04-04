const path = require('path');
const merge = require('webpack-merge');

const buildPath = path.resolve(__dirname, './../dist');

const commonConfig = {
  mode: 'development',
  output: {
    path: buildPath,
    filename: '[name].js',
    libraryTarget: 'umd',
    globalObject: 'this',
  },
  devtool: 'eval-cheap-source-map',
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.(js|ts)$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
      },
    ],
  },
};

const browserConfig = merge(commonConfig, {
  target: 'web',
  entry: {
    browser: './src/browser.ts',
  },
});

const nodeConfig = merge(commonConfig, {
  target: 'node',
  entry: {
    index: './src/index.ts',
  },
});

module.exports = [browserConfig, nodeConfig];
