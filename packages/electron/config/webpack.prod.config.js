const merge = require('webpack-merge');

const rendererConfig = require('./webpack.renderer.config');
const mainConfig = require('./webpack.main.config');

const prod = {
  mode: 'production',
};

const rendererConfigProd = merge(rendererConfig, prod);
const mainConfigProd = merge(mainConfig, prod);

module.exports = [rendererConfigProd, mainConfigProd];
