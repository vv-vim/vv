const merge = require('webpack-merge');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

const rendererConfig = require('./webpack.renderer.config');
const mainConfig = require('./webpack.main.config');

const prod = {
  mode: 'production',
  plugins: [new UglifyJSPlugin()],
};

const rendererConfigProd = merge(rendererConfig, prod);
const mainConfigProd = merge(mainConfig, prod);

module.exports = [rendererConfigProd, mainConfigProd];
