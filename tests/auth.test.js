const request = require('supertest');
const app = require('../server/index');

describe('Authentication APIs', () => {
  let authToken;
  const testUser = {
    email: 'test@example.com',
    password: 'testpassword123',
    name: '테스트유저'
  };

  beforeAll(async () => {
    // Clean up any existing test user
    try {
      await request(app)
        .delete('/api/user/account')
        .set('Authorization', `Bearer ${authToken}`);
    } catch (error) {
      // Ignore if user doesn't exist
    }
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('회원가입이 완료되었습니다.');
      expect(response.body.token).toBeDefined();
      authToken = response.body.token;
    });

    it('should reject duplicate email registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('이미 등록된 이메일입니다.');
    });

    it('should reject registration with missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'incomplete@example.com'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('모든 필드를 입력해주세요.');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('로그인 성공');
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should reject login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('비밀번호가 일치하지 않습니다.');
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('사용자를 찾을 수 없습니다.');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('로그아웃 되었습니다.');
    });

    it('should reject logout without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('인증 토큰이 필요합니다.');
    });
  });

  afterAll(async () => {
    // Clean up test user
    try {
      // Login again to get fresh token for cleanup
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });
      
      if (loginResponse.body.token) {
        await request(app)
          .delete('/api/user/account')
          .set('Authorization', `Bearer ${loginResponse.body.token}`);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });
});