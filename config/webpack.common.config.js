const path = require('path');

const buildPath = path.resolve(__dirname, './../build');

module.exports = {
  mode: 'development',
  output: {
    path: buildPath,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
      },
    ],
  },
};
