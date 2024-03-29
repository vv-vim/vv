const path = require('path');

const buildPath = path.resolve(__dirname, './../dist');

const config = {
  mode: 'development',
  entry: './src/index.ts',
  output: {
    path: buildPath,
    filename: 'index.js',
    libraryTarget: 'umd',
  },
  target: 'web',
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

module.exports = config;
