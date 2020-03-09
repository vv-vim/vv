module.exports = {
  plugins: ['jest'],
  extends: [
    'airbnb-base',
    'plugin:prettier/recommended',
    'plugin:jest/recommended',
    'plugin:jest/style',
  ],
  env: {
    browser: true,
    'jest/globals': true,
  },
  ignorePatterns: ['/tmp/', '/build/', '/dist/', 'node_modules/'],
  rules: {
    'no-unused-vars': [
      'error',
      {
        args: 'all',
        argsIgnorePattern: '^_',
      },
    ],
    'import/no-extraneous-dependencies': 'off',
    'prefer-destructuring': 'off',
    'no-mixed-operators': [
      'error',
      {
        groups: [
          ['&', '|', '^', '~', '<<', '>>', '>>>'],
          ['==', '!=', '===', '!==', '>', '>=', '<', '<='],
          ['&&', '||'],
          ['in', 'instanceof'],
        ],
        allowSamePrecedence: true,
      },
    ],
  },
};
