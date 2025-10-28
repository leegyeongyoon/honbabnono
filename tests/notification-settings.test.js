const request = require('supertest');
const app = require('../server/index');

describe('Notification Settings APIs', () => {
  let authToken;
  
  const testUser = {
    email: 'notification-test@example.com',
    password: 'testpassword123',
    name: '알림테스트유저'
  };

  beforeAll(async () => {
    // Register and login test user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    authToken = registerResponse.body.token;
  });

  describe('GET /api/user/notification-settings', () => {
    it('should get notification settings successfully', async () => {
      const response = await request(app)
        .get('/api/user/notification-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.settings).toBeDefined();
      expect(response.body.settings).toHaveProperty('push_enabled');
      expect(response.body.settings).toHaveProperty('email_enabled');
      expect(response.body.settings).toHaveProperty('meetup_updates');
      expect(response.body.settings).toHaveProperty('new_messages');
      expect(response.body.settings).toHaveProperty('marketing');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/user/notification-settings')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('인증 토큰이 필요합니다.');
    });
  });

  describe('PUT /api/user/notification-settings', () => {
    it('should update notification settings successfully', async () => {
      const newSettings = {
        push_enabled: false,
        email_enabled: true,
        meetup_updates: true,
        new_messages: false,
        marketing: false
      };

      const response = await request(app)
        .put('/api/user/notification-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newSettings)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('알림 설정이 업데이트되었습니다.');
      expect(response.body.settings.push_enabled).toBe(false);
      expect(response.body.settings.email_enabled).toBe(true);
      expect(response.body.settings.meetup_updates).toBe(true);
      expect(response.body.settings.new_messages).toBe(false);
      expect(response.body.settings.marketing).toBe(false);
    });

    it('should handle partial settings update', async () => {
      const partialSettings = {
        push_enabled: true,
        marketing: true
      };

      const response = await request(app)
        .put('/api/user/notification-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(partialSettings)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.settings.push_enabled).toBe(true);
      expect(response.body.settings.marketing).toBe(true);
      // Other settings should remain unchanged
      expect(response.body.settings.email_enabled).toBe(true);
      expect(response.body.settings.new_messages).toBe(false);
    });

    it('should reject invalid setting values', async () => {
      const invalidSettings = {
        push_enabled: 'invalid',
        email_enabled: 123
      };

      const response = await request(app)
        .put('/api/user/notification-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidSettings)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('알림 설정 값이 올바르지 않습니다.');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .put('/api/user/notification-settings')
        .send({ push_enabled: true })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should validate boolean values for all settings', async () => {
      const testCases = [
        { push_enabled: 'true' }, // string instead of boolean
        { email_enabled: 1 }, // number instead of boolean
        { meetup_updates: null }, // null instead of boolean
        { new_messages: undefined }, // undefined instead of boolean
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .put('/api/user/notification-settings')
          .set('Authorization', `Bearer ${authToken}`)
          .send(testCase)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('알림 설정 값이 올바르지 않습니다.');
      }
    });

    it('should preserve existing settings when updating subset', async () => {
      // First, set all settings to known values
      const initialSettings = {
        push_enabled: true,
        email_enabled: true,
        meetup_updates: true,
        new_messages: true,
        marketing: true
      };

      await request(app)
        .put('/api/user/notification-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(initialSettings);

      // Then update only one setting
      const partialUpdate = {
        push_enabled: false
      };

      const response = await request(app)
        .put('/api/user/notification-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(partialUpdate)
        .expect(200);

      expect(response.body.settings.push_enabled).toBe(false);
      expect(response.body.settings.email_enabled).toBe(true);
      expect(response.body.settings.meetup_updates).toBe(true);
      expect(response.body.settings.new_messages).toBe(true);
      expect(response.body.settings.marketing).toBe(true);
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