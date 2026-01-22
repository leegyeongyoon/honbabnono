module.exports = {
  // Test environment for API tests
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.test.ts',
  ],

  // Test path ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
  ],

  // Global setup and teardown
  globalSetup: '<rootDir>/tests/setup/globalSetup.js',
  globalTeardown: '<rootDir>/tests/setup/globalTeardown.js',

  // Setup files (per test file)
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Coverage settings
  collectCoverage: false, // Enable with --coverage flag
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/node_modules/**',
    '!server/test-*.js',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 80,
      statements: 80,
    },
  },

  // Test timeout (30 seconds for API tests)
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Force exit after tests complete
  forceExit: true,

  // Detect handles that prevent Jest from exiting
  detectOpenHandles: true,

  // Module name mapper for path aliases
  moduleNameMapper: {
    '^@mocks/(.*)$': '<rootDir>/tests/mocks/$1',
    '^@fixtures/(.*)$': '<rootDir>/tests/fixtures/$1',
    '^@helpers/(.*)$': '<rootDir>/tests/helpers/$1',
  },

  // Projects for different test types (optional, use with --selectProjects)
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
      testEnvironment: 'node',
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      testEnvironment: 'node',
    },
    {
      displayName: 'flows',
      testMatch: ['<rootDir>/tests/flows/**/*.test.js'],
      testEnvironment: 'node',
    },
    {
      displayName: 'legacy',
      testMatch: ['<rootDir>/tests/*.test.js'],
      testEnvironment: 'node',
    },
  ],
};
