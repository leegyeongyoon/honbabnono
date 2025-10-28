# Testing Guide

## Overview
This project includes comprehensive API testing for all backend endpoints using Jest and Supertest.

## Test Structure

### Test Files
- `tests/auth.test.js` - Authentication API tests (register, login, logout)
- `tests/user-profile.test.js` - User profile management API tests
- `tests/notification-settings.test.js` - Notification settings API tests
- `tests/privacy-management.test.js` - Privacy and data management API tests
- `tests/support-system.test.js` - Support system API tests (FAQ, inquiries)
- `tests/legal-documents.test.js` - Legal documents API tests
- `tests/simple.test.js` - Basic functionality tests

### Test Configuration
- `jest.config.js` - Jest configuration for API testing
- `tests/setup.js` - Test environment setup and helpers
- `.env.test` - Test environment variables

## Running Tests

### Individual Test Suites
```bash
# Run simple tests only
npm run test:simple

# Run all API tests
npm run test:api

# Run tests with coverage
npm run test:coverage

# Run specific test file
npx jest tests/auth.test.js
```

### All Tests
```bash
# Run all tests
npm test
```

## Test Environment

### Environment Variables
The tests use a separate environment configuration (`.env.test`) with:
- Test-specific JWT secret
- Test database connection (uses same DB but with test prefix)
- Test server port (3002 to avoid conflicts)

### Database Setup
Tests use the same PostgreSQL database but with proper cleanup:
- Each test suite creates and cleans up its own test users
- Tests are isolated and don't interfere with each other
- Database transactions ensure data consistency

## Test Coverage

The test suite covers:

### Authentication APIs
- ✅ User registration with validation
- ✅ User login with error handling
- ✅ User logout functionality
- ✅ Token validation and security

### User Profile APIs
- ✅ Profile retrieval and updates
- ✅ Password changes with validation
- ✅ Activity statistics
- ✅ Hosted and joined meetups pagination

### Notification Settings APIs
- ✅ Settings retrieval and updates
- ✅ Partial settings updates
- ✅ Validation of boolean values
- ✅ Settings persistence

### Privacy Management APIs
- ✅ GDPR-compliant data export
- ✅ Account deletion with cleanup
- ✅ Data anonymization
- ✅ Privacy compliance

### Support System APIs
- ✅ FAQ retrieval with filtering
- ✅ FAQ search functionality
- ✅ Support inquiry creation
- ✅ Inquiry validation and processing

### Legal Documents APIs
- ✅ Terms of service retrieval
- ✅ Privacy policy retrieval
- ✅ Version management
- ✅ Document validation

## CI/CD Integration

### GitHub Actions Workflow
The project includes a comprehensive CI/CD pipeline (`.github/workflows/ci-cd.yml`) that:

1. **Test Phase**
   - Runs linting checks
   - Executes all test suites
   - Generates coverage reports
   - Uploads coverage to Codecov

2. **Build Phase**
   - Builds the web application
   - Uploads build artifacts

3. **Deploy Phase** (main branch only)
   - Deploys to AWS ECS
   - Updates Docker containers
   - Ensures zero-downtime deployment

### Deployment Conditions
Deployment only occurs when:
- All tests pass ✅
- Code is pushed to main branch
- Build is successful

## Writing New Tests

### Test Structure Template
```javascript
const request = require('supertest');
const app = require('../server/index');

describe('Your API Tests', () => {
  let authToken;
  
  beforeAll(async () => {
    // Setup test user and get auth token
  });

  describe('GET /api/your-endpoint', () => {
    it('should return expected data', async () => {
      const response = await request(app)
        .get('/api/your-endpoint')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Add more assertions
    });
  });

  afterAll(async () => {
    // Cleanup test data
  });
});
```

### Best Practices
- Use descriptive test names
- Test both success and error cases
- Clean up test data in `afterAll`
- Use proper HTTP status code assertions
- Test input validation thoroughly
- Mock external dependencies when needed

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   - Tests use port 3002 by default
   - Make sure no other services are using this port

2. **Database Connection Issues**
   - Verify PostgreSQL is running
   - Check database credentials in `.env.test`

3. **Token Validation Errors**
   - Ensure JWT_SECRET is set in test environment
   - Check token format and expiration

4. **Test Timeouts**
   - Default timeout is 30 seconds
   - Increase in `jest.config.js` if needed

### Debug Mode
```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test with debug
npx jest tests/auth.test.js --verbose
```

## Coverage Reports

Coverage reports are generated in the `coverage/` directory:
- `coverage/lcov-report/index.html` - HTML coverage report
- `coverage/lcov.info` - LCOV format for CI integration

Target coverage: 80% overall, 70% per file minimum.