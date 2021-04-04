const merge = require('webpack-merge');

const webpackConfig = require('./webpack.config');

const prod = {
  mode: 'production',
  devtool: 'source-map',
};

const webpackConfigProd = webpackConfig.map((config) => merge(config, prod));

module.exports = webpackConfigProd;
