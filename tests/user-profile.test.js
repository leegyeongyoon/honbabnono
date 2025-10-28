const request = require('supertest');
const app = require('../server/index');

describe('User Profile APIs', () => {
  let authToken;
  let userId;
  
  const testUser = {
    email: 'profile-test@example.com',
    password: 'testpassword123',
    name: '프로필테스트유저'
  };

  beforeAll(async () => {
    // Register and login test user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    authToken = registerResponse.body.token;
    userId = registerResponse.body.user?.id;
  });

  describe('GET /api/user/profile', () => {
    it('should get user profile successfully', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.name).toBe(testUser.name);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
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

      const response = await request(app)
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
      const response = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('이름은 필수입니다.');
    });

    it('should reject update without authentication', async () => {
      const response = await request(app)
        .put('/api/user/profile')
        .send({ name: '새이름' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/user/password', () => {
    it('should update password successfully', async () => {
      const passwordData = {
        currentPassword: testUser.password,
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123'
      };

      const response = await request(app)
        .put('/api/user/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('비밀번호가 변경되었습니다.');

      // Update test user password for cleanup
      testUser.password = passwordData.newPassword;
    });

    it('should reject password update with wrong current password', async () => {
      const response = await request(app)
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
      const response = await request(app)
        .put('/api/user/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: testUser.password,
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

      const oauthRegisterResponse = await request(app)
        .post('/api/auth/register')
        .send(oauthUser);

      const response = await request(app)
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
      await request(app)
        .delete('/api/user/account')
        .set('Authorization', `Bearer ${oauthRegisterResponse.body.token}`);
    });
  });

  describe('GET /api/user/activity-stats', () => {
    it('should get activity stats successfully', async () => {
      const response = await request(app)
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
      const response = await request(app)
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
      const response = await request(app)
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
      await request(app)
        .delete('/api/user/account')
        .set('Authorization', `Bearer ${authToken}`);
    } catch (error) {
      // Ignore cleanup errors
    }
  });
});