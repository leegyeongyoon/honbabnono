const request = require('supertest');

describe('Simple API Test', () => {
  let app;
  
  beforeAll(async () => {
    // Create a fresh app instance for testing
    const express = require('express');
    const cors = require('cors');
    
    app = express();
    app.use(cors());
    app.use(express.json());
    
    // Simple health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', message: 'Server is running' });
    });
    
    // Simple auth test endpoint
    app.post('/test-auth', (req, res) => {
      const { email, password } = req.body;
      if (email && password) {
        res.json({ success: true, message: 'Auth test passed' });
      } else {
        res.status(400).json({ success: false, error: 'Missing credentials' });
      }
    });
  });

  describe('Health Check', () => {
    it('should return server status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.message).toBe('Server is running');
    });
  });

  describe('Auth Test', () => {
    it('should pass with valid credentials', async () => {
      const response = await request(app)
        .post('/test-auth')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Auth test passed');
    });

    it('should fail with missing credentials', async () => {
      const response = await request(app)
        .post('/test-auth')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing credentials');
    });
  });
});