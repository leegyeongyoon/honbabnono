// Test setup file for Jest
process.env.NODE_ENV = 'test';

// Load test environment variables
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') });

// Increase timeout for database operations
jest.setTimeout(30000);

// Global test configuration
beforeAll(async () => {
  console.log('🧪 Starting test suite...');
});

afterAll(async () => {
  console.log('✅ Test suite completed');
  
  // Give a moment for connections to close
  await new Promise(resolve => setTimeout(resolve, 1000));
});

// Handle unhandled rejections during tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions during tests
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Global test helpers
global.testHelpers = {
  // Generate random test email
  generateTestEmail: () => `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
  
  // Generate random test name
  generateTestName: () => `테스트유저-${Date.now()}`,
  
  // Wait utility for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Common test user data
  getTestUser: () => ({
    email: global.testHelpers.generateTestEmail(),
    password: 'testpassword123',
    name: global.testHelpers.generateTestName()
  })
};