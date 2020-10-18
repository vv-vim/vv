const rendererConfig = require('./webpack.renderer.config');
const mainConfig = require('./webpack.main.config');
const serverConfig = require('./webpack.server.config');

module.exports = [rendererConfig, mainConfig, serverConfig];
