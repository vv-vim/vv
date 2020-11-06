const path = require('path');

const buildPath = path.resolve(__dirname, './../build');

module.exports = {
  mode: 'development',
  output: {
    path: buildPath,
  },
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
