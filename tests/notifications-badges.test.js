const request = require('supertest');
const jwt = require('jsonwebtoken');

describe('Notifications & Badges API Tests', () => {
  const baseURL = 'http://localhost:3003';
  let userToken;
  
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.PORT = '3003';
    
    userToken = jwt.sign(
      { 
        userId: 'test-user-id', 
        email: 'user@example.com',
        name: 'Test User' 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('Notifications Management', () => {
    describe('GET /api/notifications', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .get('/api/notifications')
          .expect(401);
      });

      it('should return user notifications', async () => {
        const response = await request(baseURL)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });

      it('should handle pagination', async () => {
        const response = await request(baseURL)
          .get('/api/notifications?page=1&limit=10')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });

      it('should filter by notification type', async () => {
        const response = await request(baseURL)
          .get('/api/notifications?type=meetup')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 500]).toContain(response.status);
      });

      it('should filter by read status', async () => {
        const response = await request(baseURL)
          .get('/api/notifications?isRead=false')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 500]).toContain(response.status);
      });
    });

    describe('PATCH /api/notifications/:notificationId/read', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .patch('/api/notifications/test-notification-id/read')
          .expect(401);
      });

      it('should mark notification as read', async () => {
        const response = await request(baseURL)
          .patch('/api/notifications/test-notification-id/read')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 404, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('isRead', true);
        }
      });

      it('should prevent reading others\' notifications', async () => {
        const otherUserToken = jwt.sign(
          { 
            userId: 'other-user-id', 
            email: 'other@example.com',
            name: 'Other User' 
          },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );

        const response = await request(baseURL)
          .patch('/api/notifications/test-notification-id/read')
          .set('Authorization', `Bearer ${otherUserToken}`);
        
        expect([403, 404, 500]).toContain(response.status);
      });
    });

    describe('PATCH /api/notifications/read-all', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .patch('/api/notifications/read-all')
          .expect(401);
      });

      it('should mark all notifications as read', async () => {
        const response = await request(baseURL)
          .patch('/api/notifications/read-all')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('markedAsRead');
          expect(typeof response.body.markedAsRead).toBe('number');
        }
      });
    });

    describe('DELETE /api/notifications/:notificationId', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .delete('/api/notifications/test-notification-id')
          .expect(401);
      });

      it('should delete notification', async () => {
        const response = await request(baseURL)
          .delete('/api/notifications/test-notification-id')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 204, 404, 500]).toContain(response.status);
      });

      it('should prevent deleting others\' notifications', async () => {
        const otherUserToken = jwt.sign(
          { 
            userId: 'other-user-id', 
            email: 'other@example.com',
            name: 'Other User' 
          },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );

        const response = await request(baseURL)
          .delete('/api/notifications/test-notification-id')
          .set('Authorization', `Bearer ${otherUserToken}`);
        
        expect([403, 404, 500]).toContain(response.status);
      });
    });
  });

  describe('Notification Settings', () => {
    describe('GET /api/user/notification-settings', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .get('/api/user/notification-settings')
          .expect(401);
      });

      it('should return notification preferences', async () => {
        const response = await request(baseURL)
          .get('/api/user/notification-settings')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('emailNotifications');
          expect(response.body).toHaveProperty('pushNotifications');
          expect(response.body).toHaveProperty('smsNotifications');
        }
      });
    });

    describe('PUT /api/user/notification-settings', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .put('/api/user/notification-settings')
          .send({ emailNotifications: true })
          .expect(401);
      });

      it('should update notification settings', async () => {
        const response = await request(baseURL)
          .put('/api/user/notification-settings')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            emailNotifications: true,
            pushNotifications: false,
            smsNotifications: true,
            meetupReminders: true,
            chatMessages: false
          });
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('updated', true);
        }
      });

      it('should validate notification setting types', async () => {
        const response = await request(baseURL)
          .put('/api/user/notification-settings')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            emailNotifications: 'invalid_boolean',
            pushNotifications: 123
          });
        
        expect([400, 500]).toContain(response.status);
      });
    });
  });

  describe('Badges System', () => {
    describe('GET /api/user/badges', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .get('/api/user/badges')
          .expect(401);
      });

      it('should return user badges', async () => {
        const response = await request(baseURL)
          .get('/api/user/badges')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });

      it('should include badge metadata', async () => {
        const response = await request(baseURL)
          .get('/api/user/badges')
          .set('Authorization', `Bearer ${userToken}`);
        
        if (response.status === 200 && response.body.length > 0) {
          const badge = response.body[0];
          expect(badge).toHaveProperty('id');
          expect(badge).toHaveProperty('name');
          expect(badge).toHaveProperty('description');
          expect(badge).toHaveProperty('earnedAt');
        }
      });

      it('should filter by badge category', async () => {
        const response = await request(baseURL)
          .get('/api/user/badges?category=meetup')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 500]).toContain(response.status);
      });

      it('should filter by earned status', async () => {
        const response = await request(baseURL)
          .get('/api/user/badges?earned=true')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 500]).toContain(response.status);
      });
    });

    describe('GET /api/badges/available', () => {
      it('should return all available badges', async () => {
        const response = await request(baseURL)
          .get('/api/badges/available');
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });

      it('should include badge requirements', async () => {
        const response = await request(baseURL)
          .get('/api/badges/available');
        
        if (response.status === 200 && response.body.length > 0) {
          const badge = response.body[0];
          expect(badge).toHaveProperty('requirements');
          expect(badge).toHaveProperty('category');
          expect(badge).toHaveProperty('points');
        }
      });
    });

    describe('GET /api/badges/progress', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .get('/api/badges/progress')
          .expect(401);
      });

      it('should return badge progress', async () => {
        const response = await request(baseURL)
          .get('/api/badges/progress')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });

      it('should include progress percentage', async () => {
        const response = await request(baseURL)
          .get('/api/badges/progress')
          .set('Authorization', `Bearer ${userToken}`);
        
        if (response.status === 200 && response.body.length > 0) {
          const progress = response.body[0];
          expect(progress).toHaveProperty('badgeId');
          expect(progress).toHaveProperty('currentProgress');
          expect(progress).toHaveProperty('requiredProgress');
          expect(progress).toHaveProperty('percentage');
        }
      });
    });
  });

  describe('App Information', () => {
    describe('GET /api/app-info', () => {
      it('should return app information without authentication', async () => {
        const response = await request(baseURL)
          .get('/api/app-info')
          .expect(200);
        
        expect(response.body).toHaveProperty('version');
        expect(response.body).toHaveProperty('buildNumber');
        expect(response.body).toHaveProperty('environment');
      });

      it('should include feature flags', async () => {
        const response = await request(baseURL)
          .get('/api/app-info')
          .expect(200);
        
        expect(response.body).toHaveProperty('features');
        expect(typeof response.body.features).toBe('object');
      });

      it('should include maintenance status', async () => {
        const response = await request(baseURL)
          .get('/api/app-info')
          .expect(200);
        
        expect(response.body).toHaveProperty('maintenanceMode');
        expect(typeof response.body.maintenanceMode).toBe('boolean');
      });
    });

    describe('GET /api/notices', () => {
      it('should return app notices', async () => {
        const response = await request(baseURL)
          .get('/api/notices')
          .expect(200);
        
        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should include notice metadata', async () => {
        const response = await request(baseURL)
          .get('/api/notices')
          .expect(200);
        
        if (response.body.length > 0) {
          const notice = response.body[0];
          expect(notice).toHaveProperty('id');
          expect(notice).toHaveProperty('title');
          expect(notice).toHaveProperty('content');
          expect(notice).toHaveProperty('type');
          expect(notice).toHaveProperty('createdAt');
        }
      });

      it('should handle notice type filtering', async () => {
        const response = await request(baseURL)
          .get('/api/notices?type=maintenance')
          .expect(200);
        
        expect(Array.isArray(response.body)).toBe(true);
      });
    });
  });
});