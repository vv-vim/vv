module.exports = {
  testEnvironment: 'jsdom',
  clearMocks: true,
  moduleNameMapper: {
    '\\./src/(.*)': ['<rootDir>/src/$1'],
    'config/(.*)': ['<rootDir>/config/$1'],
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  setupFilesAfterEnv: ['<rootDir>/config/jest/afterEnv.js'],
  globalSetup: '<rootDir>/config/jest/globalSetup.js',
  globalTeardown: '<rootDir>/config/jest/globalTeardown.js',
};
