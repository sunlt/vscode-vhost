const config = {
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    'worker/**/*.js',
    '!worker/__tests__/**',
    '!worker/test-*.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  setupFilesAfterEnv: [
    './worker/__tests__/test-utils.js'
  ],
  verbose: true,
  testTimeout: 10000,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  clearMocks: true,
  collectCoverage: false,
  coverageProvider: 'v8'
};

module.exports = config;
