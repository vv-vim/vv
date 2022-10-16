const { merge } = require('webpack-merge');

const rendererConfig = require('./webpack.renderer.config');
const serverConfig = require('./webpack.server.config');

const prod = {
  mode: 'production',
  devtool: 'source-map',
};

const rendererConfigProd = merge(rendererConfig, prod);
const mainConfigProd = merge(serverConfig, prod);

module.exports = [rendererConfigProd, mainConfigProd];
