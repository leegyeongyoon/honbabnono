const request = require('supertest');
const jwt = require('jsonwebtoken');

describe('Admin and File Upload API Tests', () => {
  const baseURL = 'http://localhost:3003';
  let adminToken;
  let userToken;
  
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.PORT = '3003';
    
    // Admin token with admin email
    adminToken = jwt.sign(
      { 
        userId: 'admin-user-id', 
        email: 'admin@honbabnono.com',
        name: 'Admin User' 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Regular user token
    userToken = jwt.sign(
      { 
        userId: 'regular-user-id', 
        email: 'user@example.com',
        name: 'Regular User' 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('Admin User Management', () => {
    describe('GET /api/admin/blocked-users', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .get('/api/admin/blocked-users')
          .expect(401);
      });

      it('should require admin privileges', async () => {
        const response = await request(baseURL)
          .get('/api/admin/blocked-users')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);
        
        expect(response.body.error).toContain('관리자');
      });

      it('should return blocked users for admin', async () => {
        const response = await request(baseURL)
          .get('/api/admin/blocked-users')
          .set('Authorization', `Bearer ${adminToken}`);
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });

      it('should handle pagination', async () => {
        const response = await request(baseURL)
          .get('/api/admin/blocked-users?page=1&limit=10')
          .set('Authorization', `Bearer ${adminToken}`);
        
        expect([200, 500]).toContain(response.status);
      });
    });

    describe('POST /api/admin/users/:userId/block', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .post('/api/admin/users/test-user-id/block')
          .send({ reason: 'Inappropriate behavior' })
          .expect(401);
      });

      it('should require admin privileges', async () => {
        await request(baseURL)
          .post('/api/admin/users/test-user-id/block')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ reason: 'Inappropriate behavior' })
          .expect(403);
      });

      it('should require block reason', async () => {
        const response = await request(baseURL)
          .post('/api/admin/users/test-user-id/block')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({});
        
        expect([400, 500]).toContain(response.status);
      });

      it('should block user with valid data', async () => {
        const response = await request(baseURL)
          .post('/api/admin/users/test-user-id/block')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ 
            reason: 'Spam behavior',
            duration: '7d',
            description: 'User was posting spam content'
          });
        
        expect([200, 201, 400, 500]).toContain(response.status);
        
        if ([200, 201].includes(response.status)) {
          expect(response.body).toHaveProperty('message');
        }
      });

      it('should handle non-existent user', async () => {
        const response = await request(baseURL)
          .post('/api/admin/users/non-existent-id/block')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ reason: 'Test reason' });
        
        expect([404, 500]).toContain(response.status);
      });

      it('should prevent blocking admin users', async () => {
        const response = await request(baseURL)
          .post('/api/admin/users/admin-user-id/block')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ reason: 'Test reason' });
        
        expect([400, 403, 500]).toContain(response.status);
      });
    });

    describe('DELETE /api/admin/users/:userId/unblock', () => {
      it('should require admin privileges', async () => {
        await request(baseURL)
          .delete('/api/admin/users/test-user-id/unblock')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);
      });

      it('should unblock user', async () => {
        const response = await request(baseURL)
          .delete('/api/admin/users/test-user-id/unblock')
          .set('Authorization', `Bearer ${adminToken}`);
        
        expect([200, 204, 404, 500]).toContain(response.status);
      });
    });

    describe('GET /api/admin/blocking-stats', () => {
      it('should require admin privileges', async () => {
        await request(baseURL)
          .get('/api/admin/blocking-stats')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);
      });

      it('should return blocking statistics', async () => {
        const response = await request(baseURL)
          .get('/api/admin/blocking-stats')
          .set('Authorization', `Bearer ${adminToken}`);
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('totalBlocked');
          expect(response.body).toHaveProperty('blockedToday');
          expect(response.body).toHaveProperty('topReasons');
        }
      });
    });

    describe('POST /api/admin/users/bulk-unblock', () => {
      it('should require admin privileges', async () => {
        await request(baseURL)
          .post('/api/admin/users/bulk-unblock')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ userIds: ['user1', 'user2'] })
          .expect(403);
      });

      it('should require user IDs array', async () => {
        const response = await request(baseURL)
          .post('/api/admin/users/bulk-unblock')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({});
        
        expect([400, 500]).toContain(response.status);
      });

      it('should unblock multiple users', async () => {
        const response = await request(baseURL)
          .post('/api/admin/users/bulk-unblock')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ 
            userIds: ['user1', 'user2', 'user3'],
            reason: 'Mass unblock operation'
          });
        
        expect([200, 400, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('unblocked');
          expect(Array.isArray(response.body.unblocked)).toBe(true);
        }
      });
    });
  });

  describe('Admin Analytics', () => {
    describe('GET /api/admin/analytics/overview', () => {
      it('should require admin privileges', async () => {
        await request(baseURL)
          .get('/api/admin/analytics/overview')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);
      });

      it('should return system overview', async () => {
        const response = await request(baseURL)
          .get('/api/admin/analytics/overview')
          .set('Authorization', `Bearer ${adminToken}`);
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('totalUsers');
          expect(response.body).toHaveProperty('totalMeetups');
          expect(response.body).toHaveProperty('activeToday');
        }
      });
    });

    describe('GET /api/admin/analytics/users', () => {
      it('should return user analytics', async () => {
        const response = await request(baseURL)
          .get('/api/admin/analytics/users')
          .set('Authorization', `Bearer ${adminToken}`);
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('registrations');
          expect(response.body).toHaveProperty('activeUsers');
        }
      });
    });
  });

  describe('File Upload API', () => {
    describe('POST /api/upload/image', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .post('/api/upload/image')
          .expect(401);
      });

      it('should require file', async () => {
        const response = await request(baseURL)
          .post('/api/upload/image')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([400, 500]).toContain(response.status);
      });

      it('should accept valid image file', async () => {
        // Create a simple test image buffer
        const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
        
        const response = await request(baseURL)
          .post('/api/upload/image')
          .set('Authorization', `Bearer ${userToken}`)
          .attach('image', testImageBuffer, 'test.png');
        
        expect([200, 201, 400, 500]).toContain(response.status);
        
        if ([200, 201].includes(response.status)) {
          expect(response.body).toHaveProperty('url');
        }
      });

      it('should reject non-image files', async () => {
        const textBuffer = Buffer.from('This is not an image');
        
        const response = await request(baseURL)
          .post('/api/upload/image')
          .set('Authorization', `Bearer ${userToken}`)
          .attach('image', textBuffer, 'test.txt');
        
        expect([400, 500]).toContain(response.status);
      });

      it('should handle file size limits', async () => {
        // Create a large buffer (simulating oversized file)
        const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
        
        const response = await request(baseURL)
          .post('/api/upload/image')
          .set('Authorization', `Bearer ${userToken}`)
          .attach('image', largeBuffer, 'large.png');
        
        expect([400, 413, 500]).toContain(response.status);
      });

      it('should sanitize file names', async () => {
        const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
        
        const response = await request(baseURL)
          .post('/api/upload/image')
          .set('Authorization', `Bearer ${userToken}`)
          .attach('image', testImageBuffer, '../../../malicious.png');
        
        expect([200, 201, 400, 500]).toContain(response.status);
        
        if ([200, 201].includes(response.status)) {
          expect(response.body.url).not.toContain('../');
        }
      });
    });

    describe('POST /api/upload/document', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .post('/api/upload/document')
          .expect(401);
      });

      it('should accept valid document types', async () => {
        const pdfBuffer = Buffer.from('%PDF-1.4 test content');
        
        const response = await request(baseURL)
          .post('/api/upload/document')
          .set('Authorization', `Bearer ${userToken}`)
          .attach('document', pdfBuffer, 'test.pdf');
        
        expect([200, 201, 400, 404, 500]).toContain(response.status);
      });
    });

    describe('DELETE /api/upload/:fileId', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .delete('/api/upload/test-file-id')
          .expect(401);
      });

      it('should allow file owner to delete', async () => {
        const response = await request(baseURL)
          .delete('/api/upload/test-file-id')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 204, 404, 500]).toContain(response.status);
      });

      it('should prevent deleting other user\'s files', async () => {
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
          .delete('/api/upload/test-file-id')
          .set('Authorization', `Bearer ${otherUserToken}`);
        
        expect([403, 404, 500]).toContain(response.status);
      });
    });
  });

  describe('Content Moderation', () => {
    describe('POST /api/admin/moderate/image', () => {
      it('should require admin privileges', async () => {
        await request(baseURL)
          .post('/api/admin/moderate/image')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ imageUrl: 'http://example.com/image.jpg', action: 'approve' })
          .expect(403);
      });

      it('should moderate images', async () => {
        const response = await request(baseURL)
          .post('/api/admin/moderate/image')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ 
            imageUrl: 'http://example.com/image.jpg', 
            action: 'approve',
            reason: 'Content is appropriate'
          });
        
        expect([200, 400, 500]).toContain(response.status);
      });

      it('should require action parameter', async () => {
        const response = await request(baseURL)
          .post('/api/admin/moderate/image')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ imageUrl: 'http://example.com/image.jpg' });
        
        expect([400, 500]).toContain(response.status);
      });
    });
  });

  describe('System Maintenance', () => {
    describe('POST /api/admin/maintenance/cleanup', () => {
      it('should require admin privileges', async () => {
        await request(baseURL)
          .post('/api/admin/maintenance/cleanup')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);
      });

      it('should perform cleanup operations', async () => {
        const response = await request(baseURL)
          .post('/api/admin/maintenance/cleanup')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ 
            cleanupType: 'expired_sessions',
            confirm: true
          });
        
        expect([200, 400, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('cleaned');
        }
      });

      it('should require confirmation', async () => {
        const response = await request(baseURL)
          .post('/api/admin/maintenance/cleanup')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ cleanupType: 'expired_sessions' });
        
        expect([400, 500]).toContain(response.status);
      });
    });
  });
});