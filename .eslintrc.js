// Render airbnb as warnings
const path = require('path');
const eslint = require('eslint');

const configFile = path.join(__dirname, '.eslintrc');
const cliEngine = new eslint.CLIEngine({ useEslintrc: false, configFile });

const config = cliEngine.getConfigForFile();

for (var rule in config.rules) {
  if (config.rules.hasOwnProperty(rule)) {
    if (Array.isArray(config.rules[rule])) {
      if (config.rules[rule][0] === 2 || config.rules[rule][0] === 'error') {
        config.rules[rule][0] = 1
      }
    } else {
      if (config.rules[rule] === 2 || config.rules[rule] === 'error') {
        config.rules[rule] = 1
      }
    }
  }
}

module.exports = config;
