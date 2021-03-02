module.exports = {
  testEnvironment: 'jsdom',
  clearMocks: true,
  moduleNameMapper: {
    'src/(.*)': ['<rootDir>/src/$1'],
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};
