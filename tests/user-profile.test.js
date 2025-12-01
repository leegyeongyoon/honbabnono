const request = require('supertest');
const jwt = require('jsonwebtoken');

describe('User Profile APIs', () => {
  const baseURL = 'http://localhost:3003';
  let authToken;
  
  beforeAll(async () => {
    // Create test JWT token with same secret as .env.test
    authToken = jwt.sign(
      { 
        userId: '550e8400-e29b-41d4-a716-446655440000', 
        email: 'profile-test@example.com',
        name: '프로필테스트유저' 
      },
      'test_jwt_secret_key_123456789',
      { expiresIn: '1h' }
    );
  });

  describe('GET /api/user/profile', () => {
    it('should get user profile successfully', async () => {
      const response = await request(baseURL)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('profile-test@example.com');
      expect(response.body.user.name).toBe('프로필테스트유저');
    });

    it('should reject request without authentication', async () => {
      const response = await request(baseURL)
        .get('/api/user/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('인증 토큰이 필요합니다.');
    });
  });

  describe('PUT /api/user/profile', () => {
    it('should update profile successfully', async () => {
      const updatedData = {
        name: '업데이트된이름',
        profile_image: 'https://example.com/new-avatar.jpg'
      };

      const response = await request(baseURL)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('프로필이 업데이트되었습니다.');
      expect(response.body.user.name).toBe(updatedData.name);
      expect(response.body.user.profile_image).toBe(updatedData.profile_image);
    });

    it('should reject update with empty name', async () => {
      const response = await request(baseURL)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('이름은 필수입니다.');
    });

    it('should reject update without authentication', async () => {
      const response = await request(baseURL)
        .put('/api/user/profile')
        .send({ name: '새이름' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/user/password', () => {
    it('should update password successfully', async () => {
      const passwordData = {
        currentPassword: 'testpassword123',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123'
      };

      const response = await request(baseURL)
        .put('/api/user/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('비밀번호가 변경되었습니다.');

      // Password updated successfully
    });

    it('should reject password update with wrong current password', async () => {
      const response = await request(baseURL)
        .put('/api/user/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('현재 비밀번호가 일치하지 않습니다.');
    });

    it('should reject password update with mismatched confirmation', async () => {
      const response = await request(baseURL)
        .put('/api/user/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'testpassword123',
          newPassword: 'newpassword123',
          confirmPassword: 'differentpassword'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
    });

    it('should reject password update for OAuth users', async () => {
      // Create OAuth user for this test
      const oauthUser = {
        email: 'oauth@example.com',
        name: 'OAuth유저',
        provider: 'google',
        provider_id: 'google123'
      };

      const oauthRegisterResponse = await request(baseURL)
        .post('/api/auth/register')
        .send(oauthUser);

      const response = await request(baseURL)
        .put('/api/user/password')
        .set('Authorization', `Bearer ${oauthRegisterResponse.body.token}`)
        .send({
          currentPassword: 'anypassword',
          newPassword: 'newpassword123',
          confirmPassword: 'newpassword123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('소셜 로그인 사용자는 비밀번호를 변경할 수 없습니다.');

      // Cleanup OAuth user
      await request(baseURL)
        .delete('/api/user/account')
        .set('Authorization', `Bearer ${oauthRegisterResponse.body.token}`);
    });
  });

  describe('GET /api/user/activity-stats', () => {
    it('should get activity stats successfully', async () => {
      const response = await request(baseURL)
        .get('/api/user/activity-stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.hostedMeetups).toBeGreaterThanOrEqual(0);
      expect(response.body.data.joinedMeetups).toBeGreaterThanOrEqual(0);
      expect(response.body.data.completedMeetups).toBeGreaterThanOrEqual(0);
      expect(response.body.data.upcomingMeetups).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /api/user/hosted-meetups', () => {
    it('should get hosted meetups with pagination', async () => {
      const response = await request(baseURL)
        .get('/api/user/hosted-meetups')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });
  });

  describe('GET /api/user/joined-meetups', () => {
    it('should get joined meetups with pagination', async () => {
      const response = await request(baseURL)
        .get('/api/user/joined-meetups')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(5);
    });
  });

  afterAll(async () => {
    // Clean up test user
    try {
      await request(baseURL)
        .delete('/api/user/account')
        .set('Authorization', `Bearer ${authToken}`);
    } catch (error) {
      // Ignore cleanup errors
    }
  });
});