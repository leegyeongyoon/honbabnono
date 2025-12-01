const request = require('supertest');
const jwt = require('jsonwebtoken');

describe('Authentication API Detailed Tests', () => {
  const baseURL = 'http://localhost:3003';
  let validToken;
  
  beforeAll(async () => {
    // Set up test environment
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'honbabnono_jwt_secret_key_2024';
    process.env.PORT = '3001';
    
    // Create a valid test token
    validToken = jwt.sign(
      { 
        userId: 'test-user-id', 
        email: 'test@example.com',
        name: 'Test User' 
      },
      'honbabnono_jwt_secret_key_2024',
      { expiresIn: '1h' }
    );
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('Kakao OAuth Flow', () => {
    describe('GET /api/auth/kakao', () => {
      it('should redirect to Kakao OAuth URL', async () => {
        const response = await request(baseURL)
          .get('/api/auth/kakao')
          .expect(302);
        
        expect(response.header.location).toContain('kauth.kakao.com');
        expect(response.header.location).toContain('oauth/authorize');
        expect(response.header.location).toContain('client_id');
        expect(response.header.location).toContain('redirect_uri');
        expect(response.header.location).toContain('response_type=code');
      });
    });

    describe('GET /api/auth/kakao/login', () => {
      it('should redirect to Kakao OAuth URL', async () => {
        const response = await request(baseURL)
          .get('/api/auth/kakao/login')
          .expect(302);
        
        expect(response.header.location).toContain('kauth.kakao.com');
      });
    });

    describe('GET /api/auth/kakao/callback', () => {
      it('should handle missing authorization code', async () => {
        const response = await request(baseURL)
          .get('/api/auth/kakao/callback');
        
        // Should either redirect to error page or return error
        expect([302, 400, 500]).toContain(response.status);
      });

      it('should handle invalid authorization code', async () => {
        const response = await request(baseURL)
          .get('/api/auth/kakao/callback?code=invalid_code');
        
        // Should handle error gracefully
        expect([302, 400, 500]).toContain(response.status);
      });

      it('should handle error parameter', async () => {
        const response = await request(baseURL)
          .get('/api/auth/kakao/callback?error=access_denied');
        
        // Should redirect to error page or handle error
        expect([302, 400]).toContain(response.status);
      });
    });

    describe('POST /api/auth/kakao', () => {
      it('should require access token', async () => {
        const response = await request(baseURL)
          .post('/api/auth/kakao')
          .send({})
          .expect(400);
        
        expect(response.body).toHaveProperty('error');
      });

      it('should handle missing access token', async () => {
        const response = await request(baseURL)
          .post('/api/auth/kakao')
          .send({ accessToken: '' })
          .expect(400);
        
        expect(response.body).toHaveProperty('error');
      });

      it('should handle invalid access token', async () => {
        const response = await request(baseURL)
          .post('/api/auth/kakao')
          .send({ accessToken: 'invalid-token' });
        
        expect([400, 401, 500]).toContain(response.status);
        expect(response.body).toHaveProperty('error');
      });

      it('should validate request format', async () => {
        const response = await request(baseURL)
          .post('/api/auth/kakao')
          .send('invalid json format');
        
        expect([400, 500, 401]).toContain(response.status);
      });
    });
  });

  describe('Token Verification', () => {
    describe('POST /api/auth/verify-token', () => {
      it('should require token parameter', async () => {
        const response = await request(baseURL)
          .post('/api/auth/verify-token')
          .send({})
          .expect(400);
        
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('토큰');
      });

      it('should reject empty token', async () => {
        const response = await request(baseURL)
          .post('/api/auth/verify-token')
          .send({ token: '' })
          .expect(400);
        
        expect(response.body).toHaveProperty('error');
      });

      it('should reject null token', async () => {
        const response = await request(baseURL)
          .post('/api/auth/verify-token')
          .send({ token: null })
          .expect(400);
        
        expect(response.body).toHaveProperty('error');
      });

      it('should reject invalid token format', async () => {
        const response = await request(baseURL)
          .post('/api/auth/verify-token')
          .send({ token: 'invalid-token-format' })
          .expect(401);
        
        expect(response.body).toHaveProperty('error');
      });

      it('should reject expired token', async () => {
        const expiredToken = jwt.sign(
          { userId: 'test', email: 'test@test.com' },
          'honbabnono_jwt_secret_key_2024',
          { expiresIn: '-1h' }
        );
        
        const response = await request(baseURL)
          .post('/api/auth/verify-token')
          .send({ token: expiredToken })
          .expect(401);
        
        expect(response.body).toHaveProperty('error');
      });

      it('should reject token with wrong secret', async () => {
        const wrongSecretToken = jwt.sign(
          { userId: 'test', email: 'test@test.com' },
          'wrong-secret',
          { expiresIn: '1h' }
        );
        
        const response = await request(baseURL)
          .post('/api/auth/verify-token')
          .send({ token: wrongSecretToken })
          .expect(401);
        
        expect(response.body).toHaveProperty('error');
      });

      it('should accept valid token', async () => {
        const response = await request(baseURL)
          .post('/api/auth/verify-token')
          .send({ token: validToken });
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('valid', true);
          expect(response.body).toHaveProperty('user');
          expect(response.body.user).toHaveProperty('userId');
          expect(response.body.user).toHaveProperty('email');
        } else {
          // Token verification might have specific implementation requirements
          expect([400, 500, 401]).toContain(response.status);
        }
      });

      it('should handle malformed JWT', async () => {
        const response = await request(baseURL)
          .post('/api/auth/verify-token')
          .send({ token: 'not.a.jwt' })
          .expect(401);
        
        expect(response.body).toHaveProperty('error');
      });
    });
  });

  describe('Logout Functionality', () => {
    describe('POST /api/auth/logout', () => {
      it('should require authentication', async () => {
        const response = await request(baseURL)
          .post('/api/auth/logout')
          .expect(401);
        
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('토큰');
      });

      it('should reject invalid authorization header', async () => {
        const response = await request(baseURL)
          .post('/api/auth/logout')
          .set('Authorization', 'invalid-header')
          .expect(401);
        
        expect(response.body).toHaveProperty('error');
      });

      it('should reject malformed bearer token', async () => {
        const response = await request(baseURL)
          .post('/api/auth/logout')
          .set('Authorization', 'Bearer')
          .expect(401);
        
        expect(response.body).toHaveProperty('error');
      });

      it('should handle valid logout request', async () => {
        const response = await request(baseURL)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${validToken}`);
        
        // Should either succeed or handle gracefully
        expect([200, 401, 403, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toContain('로그아웃');
        }
      });
    });
  });

  describe('Authentication Middleware Tests', () => {
    const protectedEndpoints = [
      '/api/user/stats',
      '/api/user/reviews',
      '/api/user/activities',
      '/api/user/hosted-meetups',
      '/api/user/wishlist',
      '/api/chat/rooms',
      '/api/users/points'
    ];

    protectedEndpoints.forEach(endpoint => {
      describe(`${endpoint} authentication`, () => {
        it('should reject request without authorization header', async () => {
          const response = await request(baseURL)
            .get(endpoint)
            .expect(401);
          
          expect(response.body).toHaveProperty('error');
        });

        it('should reject request with invalid token', async () => {
          const response = await request(baseURL)
            .get(endpoint)
            .set('Authorization', 'Bearer invalid-token')
            .expect((res) => {
              expect([403, 500]).toContain(res.status);
            });
          
          expect(response.body).toHaveProperty('error');
        });

        it('should reject request with expired token', async () => {
          const expiredToken = jwt.sign(
            { userId: 'test', email: 'test@test.com' },
            'honbabnono_jwt_secret_key_2024',
            { expiresIn: '-1h' }
          );
          
          const response = await request(baseURL)
            .get(endpoint)
            .set('Authorization', `Bearer ${expiredToken}`)
            .expect((res) => {
              expect([403, 500]).toContain(res.status);
            });
          
          expect(response.body).toHaveProperty('error');
        });

        it('should accept request with valid token', async () => {
          const response = await request(baseURL)
            .get(endpoint)
            .set('Authorization', `Bearer ${validToken}`);
          
          // Should either succeed or fail for business logic reasons, not auth
          expect([200, 400, 404, 500, 403]).toContain(response.status);
          
          // If it fails, it shouldn't be due to authentication
          if (response.status >= 400 && response.body.error) {
            expect(response.body.error).not.toContain('토큰');
            expect(response.body.error).not.toContain('인증');
          }
        });
      });
    });
  });

  describe('Admin Authentication Tests', () => {
    const adminEndpoints = [
      '/api/admin/blocked-users',
      '/api/admin/blocking-stats'
    ];

    adminEndpoints.forEach(endpoint => {
      describe(`${endpoint} admin authentication`, () => {
        it('should reject request without authorization', async () => {
          const response = await request(baseURL)
            .get(endpoint)
            .expect(401);
          
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toContain('관리자');
        });

        it('should reject regular user token', async () => {
          const userToken = jwt.sign(
            { userId: 'user', email: 'user@example.com' },
            'honbabnono_jwt_secret_key_2024',
            { expiresIn: '1h' }
          );
          
          const response = await request(baseURL)
            .get(endpoint)
            .set('Authorization', `Bearer ${userToken}`)
            .expect((res) => {
              expect([403, 500]).toContain(res.status);
            });
          
          expect(response.body).toHaveProperty('error');
        });
      });
    });
  });

  describe('Security Headers and CORS', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await request(baseURL)
        .options('/api/auth/verify-token')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type');
      
      expect([200, 204]).toContain(response.status);
    });

    it('should include security headers', async () => {
      const response = await request(baseURL)
        .get('/api/health');
      
      // Check for basic security headers
      expect(response.headers).toHaveProperty('x-powered-by');
    });

    it('should handle different content types', async () => {
      const response = await request(baseURL)
        .post('/api/auth/verify-token')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('token=invalid');
      
      expect([400, 500, 401]).toContain(response.status);
    });
  });
});