const request = require('supertest');
const app = require('../server/index');

describe('Privacy Management APIs', () => {
  let authToken;
  
  const testUser = {
    email: 'privacy-test@example.com',
    password: 'testpassword123',
    name: '프라이버시테스트유저'
  };

  beforeAll(async () => {
    // Register and login test user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    authToken = registerResponse.body.token;
  });

  describe('GET /api/user/data-export', () => {
    it('should export user data successfully', async () => {
      const response = await request(app)
        .get('/api/user/data-export')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.name).toBe(testUser.name);
      expect(response.body.data.hostedMeetups).toBeInstanceOf(Array);
      expect(response.body.data.joinedMeetups).toBeInstanceOf(Array);
      expect(response.body.data.notificationSettings).toBeDefined();
      expect(response.body.data.exportedAt).toBeDefined();
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/user/data-export')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('인증 토큰이 필요합니다.');
    });

    it('should include all required user data fields', async () => {
      const response = await request(app)
        .get('/api/user/data-export')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const userData = response.body.data.user;
      expect(userData).toHaveProperty('id');
      expect(userData).toHaveProperty('email');
      expect(userData).toHaveProperty('name');
      expect(userData).toHaveProperty('provider');
      expect(userData).toHaveProperty('is_verified');
      expect(userData).toHaveProperty('created_at');
      expect(userData).toHaveProperty('updated_at');
      
      // Should not include sensitive data
      expect(userData).not.toHaveProperty('password');
    });

    it('should include notification settings in export', async () => {
      const response = await request(app)
        .get('/api/user/data-export')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const notificationSettings = response.body.data.notificationSettings;
      expect(notificationSettings).toHaveProperty('push_enabled');
      expect(notificationSettings).toHaveProperty('email_enabled');
      expect(notificationSettings).toHaveProperty('meetup_updates');
      expect(notificationSettings).toHaveProperty('new_messages');
      expect(notificationSettings).toHaveProperty('marketing');
    });

    it('should include meetup data in export', async () => {
      const response = await request(app)
        .get('/api/user/data-export')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.hostedMeetups).toBeInstanceOf(Array);
      expect(response.body.data.joinedMeetups).toBeInstanceOf(Array);
    });

    it('should include valid export timestamp', async () => {
      const response = await request(app)
        .get('/api/user/data-export')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const exportedAt = new Date(response.body.data.exportedAt);
      expect(exportedAt).toBeInstanceOf(Date);
      expect(exportedAt.getTime()).toBeLessThanOrEqual(Date.now());
      expect(exportedAt.getTime()).toBeGreaterThan(Date.now() - 60000); // Within last minute
    });
  });

  describe('DELETE /api/user/account', () => {
    let deleteTestToken;

    beforeEach(async () => {
      // Create a separate user for deletion tests
      const deleteTestUser = {
        email: 'delete-test@example.com',
        password: 'testpassword123',
        name: '삭제테스트유저'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(deleteTestUser);
      
      deleteTestToken = registerResponse.body.token;
    });

    it('should delete account successfully', async () => {
      const response = await request(app)
        .delete('/api/user/account')
        .set('Authorization', `Bearer ${deleteTestToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('계정이 성공적으로 삭제되었습니다.');

      // Verify user can't login anymore
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'delete-test@example.com',
          password: 'testpassword123'
        })
        .expect(404);

      expect(loginResponse.body.success).toBe(false);
      expect(loginResponse.body.error).toBe('사용자를 찾을 수 없습니다.');
    });

    it('should reject deletion without authentication', async () => {
      const response = await request(app)
        .delete('/api/user/account')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('인증 토큰이 필요합니다.');
    });

    it('should handle deletion of user with meetups', async () => {
      // Create a meetup for the user (if meetup creation API exists)
      // This would test cascade deletion or proper cleanup
      
      const response = await request(app)
        .delete('/api/user/account')
        .set('Authorization', `Bearer ${deleteTestToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should make deleted user token invalid', async () => {
      await request(app)
        .delete('/api/user/account')
        .set('Authorization', `Bearer ${deleteTestToken}`)
        .expect(200);

      // Try to use the token after deletion
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${deleteTestToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Privacy Data Handling', () => {
    it('should not expose sensitive data in any endpoint', async () => {
      // Test profile endpoint
      const profileResponse = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(profileResponse.body.user).not.toHaveProperty('password');

      // Test data export endpoint
      const exportResponse = await request(app)
        .get('/api/user/data-export')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(exportResponse.body.data.user).not.toHaveProperty('password');
    });

    it('should handle data export for user with no additional data', async () => {
      // Create a new user with minimal data
      const minimalUser = {
        email: 'minimal@example.com',
        password: 'testpassword123',
        name: '미니멀유저'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(minimalUser);

      const response = await request(app)
        .get('/api/user/data-export')
        .set('Authorization', `Bearer ${registerResponse.body.token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.hostedMeetups).toEqual([]);
      expect(response.body.data.joinedMeetups).toEqual([]);

      // Cleanup
      await request(app)
        .delete('/api/user/account')
        .set('Authorization', `Bearer ${registerResponse.body.token}`);
    });
  });

  afterAll(async () => {
    // Clean up main test user
    try {
      await request(app)
        .delete('/api/user/account')
        .set('Authorization', `Bearer ${authToken}`);
    } catch (error) {
      // Ignore cleanup errors
    }
  });
});