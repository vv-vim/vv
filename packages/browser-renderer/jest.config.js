module.exports = {
  clearMocks: true,
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
  collectCoverageFrom: ['src/**/*.{ts,js}'],
  testPathIgnorePatterns: ['/node_modules/', 'dist'],
};
