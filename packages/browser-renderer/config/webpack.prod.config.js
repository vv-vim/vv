const { merge } = require('webpack-merge');

const webpackConfig = require('./webpack.config');

const prod = {
  mode: 'production',
  devtool: 'source-map',
};

const webpackConfigProd = merge(webpackConfig, prod);

module.exports = webpackConfigProd;
