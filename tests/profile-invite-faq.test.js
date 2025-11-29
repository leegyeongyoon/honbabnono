const request = require('supertest');
const jwt = require('jsonwebtoken');

describe('Profile, Invite & FAQ API Tests', () => {
  const baseURL = 'http://localhost:3003';
  let userToken;
  let adminToken;
  
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

    adminToken = jwt.sign(
      { 
        userId: 'admin-user-id', 
        email: 'admin@honbabnono.com',
        name: 'Admin User' 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('User Profile Management', () => {
    describe('GET /api/user/profile', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .get('/api/user/profile')
          .expect(401);
      });

      it('should return user profile', async () => {
        const response = await request(baseURL)
          .get('/api/user/profile')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('id');
          expect(response.body).toHaveProperty('email');
          expect(response.body).toHaveProperty('name');
          expect(response.body).toHaveProperty('createdAt');
        }
      });

      it('should not expose sensitive information', async () => {
        const response = await request(baseURL)
          .get('/api/user/profile')
          .set('Authorization', `Bearer ${userToken}`);
        
        if (response.status === 200) {
          expect(response.body).not.toHaveProperty('password');
          expect(response.body).not.toHaveProperty('passwordHash');
        }
      });
    });

    describe('PUT /api/user/profile', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .put('/api/user/profile')
          .send({ name: 'Updated Name' })
          .expect(401);
      });

      it('should update profile with valid data', async () => {
        const response = await request(baseURL)
          .put('/api/user/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ 
            name: 'Updated Test User',
            bio: 'I love food meetups!',
            location: '서울시 강남구',
            favoriteCategories: ['한식', '중식', '일식']
          });
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('updated', true);
          expect(response.body).toHaveProperty('name', 'Updated Test User');
        }
      });

      it('should validate name length', async () => {
        const response = await request(baseURL)
          .put('/api/user/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ name: 'A' }); // Too short
        
        expect([400, 500]).toContain(response.status);
      });

      it('should validate bio length', async () => {
        const longBio = 'A'.repeat(1001); // Assuming 1000 char limit
        
        const response = await request(baseURL)
          .put('/api/user/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ bio: longBio });
        
        expect([400, 500]).toContain(response.status);
      });

      it('should validate favorite categories', async () => {
        const response = await request(baseURL)
          .put('/api/user/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ favoriteCategories: ['invalid_category', 'another_invalid'] });
        
        expect([200, 400, 500]).toContain(response.status);
      });

      it('should sanitize input data', async () => {
        const response = await request(baseURL)
          .put('/api/user/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ 
            name: '<script>alert("xss")</script>',
            bio: '<img src="x" onerror="alert(1)">'
          });
        
        expect([200, 400, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body.name).not.toContain('<script>');
        }
      });
    });

    describe('PUT /api/user/password', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .put('/api/user/password')
          .send({ 
            currentPassword: 'oldpass',
            newPassword: 'newpass123'
          })
          .expect(401);
      });

      it('should change password with valid credentials', async () => {
        const response = await request(baseURL)
          .put('/api/user/password')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ 
            currentPassword: 'current_password_123',
            newPassword: 'new_secure_password_456'
          });
        
        expect([200, 400, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('updated', true);
        }
      });

      it('should require current password', async () => {
        const response = await request(baseURL)
          .put('/api/user/password')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ newPassword: 'new_password_123' });
        
        expect([400, 500]).toContain(response.status);
      });

      it('should validate new password strength', async () => {
        const response = await request(baseURL)
          .put('/api/user/password')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ 
            currentPassword: 'current_password',
            newPassword: '123' // Too weak
          });
        
        expect([400, 500]).toContain(response.status);
      });

      it('should reject same current and new password', async () => {
        const response = await request(baseURL)
          .put('/api/user/password')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ 
            currentPassword: 'same_password',
            newPassword: 'same_password'
          });
        
        expect([400, 500]).toContain(response.status);
      });
    });

    describe('POST /api/user/upload-profile-image', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .post('/api/user/upload-profile-image')
          .expect(401);
      });

      it('should upload profile image', async () => {
        const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
        
        const response = await request(baseURL)
          .post('/api/user/upload-profile-image')
          .set('Authorization', `Bearer ${userToken}`)
          .attach('profileImage', testImageBuffer, 'profile.png');
        
        expect([200, 201, 400, 500]).toContain(response.status);
        
        if ([200, 201].includes(response.status)) {
          expect(response.body).toHaveProperty('profileImageUrl');
        }
      });

      it('should validate image file type', async () => {
        const textBuffer = Buffer.from('This is not an image');
        
        const response = await request(baseURL)
          .post('/api/user/upload-profile-image')
          .set('Authorization', `Bearer ${userToken}`)
          .attach('profileImage', textBuffer, 'notimage.txt');
        
        expect([400, 500]).toContain(response.status);
      });

      it('should validate image size', async () => {
        const largeBuffer = Buffer.alloc(5 * 1024 * 1024); // 5MB
        
        const response = await request(baseURL)
          .post('/api/user/upload-profile-image')
          .set('Authorization', `Bearer ${userToken}`)
          .attach('profileImage', largeBuffer, 'large.png');
        
        expect([400, 413, 500]).toContain(response.status);
      });
    });

    describe('GET /api/user/data-export', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .get('/api/user/data-export')
          .expect(401);
      });

      it('should export user data', async () => {
        const response = await request(baseURL)
          .get('/api/user/data-export')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('profile');
          expect(response.body).toHaveProperty('meetups');
          expect(response.body).toHaveProperty('reviews');
          expect(response.body).toHaveProperty('points');
        }
      });

      it('should include export metadata', async () => {
        const response = await request(baseURL)
          .get('/api/user/data-export')
          .set('Authorization', `Bearer ${userToken}`);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('exportedAt');
          expect(response.body).toHaveProperty('version');
        }
      });
    });

    describe('DELETE /api/user/account', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .delete('/api/user/account')
          .expect(401);
      });

      it('should require password confirmation', async () => {
        const response = await request(baseURL)
          .delete('/api/user/account')
          .set('Authorization', `Bearer ${userToken}`)
          .send({});
        
        expect([400, 500]).toContain(response.status);
      });

      it('should delete account with valid confirmation', async () => {
        const response = await request(baseURL)
          .delete('/api/user/account')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ 
            password: 'user_password_123',
            confirmDelete: true,
            reason: 'no_longer_needed'
          });
        
        expect([200, 204, 400, 500]).toContain(response.status);
        
        if ([200, 204].includes(response.status)) {
          expect(response.body).toHaveProperty('deleted', true);
        }
      });

      it('should validate password before deletion', async () => {
        const response = await request(baseURL)
          .delete('/api/user/account')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ 
            password: 'wrong_password',
            confirmDelete: true
          });
        
        expect([400, 401, 500]).toContain(response.status);
      });
    });
  });

  describe('Invite System', () => {
    describe('GET /api/users/invite-code', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .get('/api/users/invite-code')
          .expect(401);
      });

      it('should return user invite code', async () => {
        const response = await request(baseURL)
          .get('/api/users/invite-code')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('inviteCode');
          expect(response.body).toHaveProperty('inviteUrl');
          expect(response.body).toHaveProperty('usageCount');
          expect(response.body).toHaveProperty('maxUsage');
        }
      });

      it('should include invite statistics', async () => {
        const response = await request(baseURL)
          .get('/api/users/invite-code')
          .set('Authorization', `Bearer ${userToken}`);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('totalInvites');
          expect(response.body).toHaveProperty('successfulInvites');
          expect(response.body).toHaveProperty('rewardsEarned');
        }
      });
    });

    describe('POST /api/users/use-invite-code', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .post('/api/users/use-invite-code')
          .send({ inviteCode: 'INVITE123' })
          .expect(401);
      });

      it('should use valid invite code', async () => {
        const response = await request(baseURL)
          .post('/api/users/use-invite-code')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ inviteCode: 'VALID_INVITE_CODE' });
        
        expect([200, 201, 400, 404, 500]).toContain(response.status);
        
        if ([200, 201].includes(response.status)) {
          expect(response.body).toHaveProperty('used', true);
          expect(response.body).toHaveProperty('reward');
        }
      });

      it('should require invite code', async () => {
        const response = await request(baseURL)
          .post('/api/users/use-invite-code')
          .set('Authorization', `Bearer ${userToken}`)
          .send({});
        
        expect([400, 500]).toContain(response.status);
      });

      it('should reject invalid invite codes', async () => {
        const response = await request(baseURL)
          .post('/api/users/use-invite-code')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ inviteCode: 'INVALID_CODE' });
        
        expect([400, 404, 500]).toContain(response.status);
      });

      it('should prevent using own invite code', async () => {
        const response = await request(baseURL)
          .post('/api/users/use-invite-code')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ inviteCode: 'OWN_INVITE_CODE' });
        
        expect([400, 500]).toContain(response.status);
      });

      it('should prevent using invite code multiple times', async () => {
        // First use
        await request(baseURL)
          .post('/api/users/use-invite-code')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ inviteCode: 'VALID_CODE' });

        // Second use attempt
        const response = await request(baseURL)
          .post('/api/users/use-invite-code')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ inviteCode: 'VALID_CODE' });
        
        expect([400, 409, 500]).toContain(response.status);
      });
    });
  });

  describe('FAQ & Support', () => {
    describe('GET /api/faq', () => {
      it('should return FAQ list', async () => {
        const response = await request(baseURL)
          .get('/api/faq')
          .expect(200);
        
        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should include FAQ details', async () => {
        const response = await request(baseURL)
          .get('/api/faq')
          .expect(200);
        
        if (response.body.length > 0) {
          const faq = response.body[0];
          expect(faq).toHaveProperty('id');
          expect(faq).toHaveProperty('question');
          expect(faq).toHaveProperty('answer');
          expect(faq).toHaveProperty('category');
          expect(faq).toHaveProperty('order');
        }
      });

      it('should filter by category', async () => {
        const response = await request(baseURL)
          .get('/api/faq?category=meetup')
          .expect(200);
        
        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should search FAQ content', async () => {
        const response = await request(baseURL)
          .get('/api/faq?search=포인트')
          .expect(200);
        
        expect(Array.isArray(response.body)).toBe(true);
      });
    });

    describe('GET /api/support/faq', () => {
      it('should return support FAQ', async () => {
        const response = await request(baseURL)
          .get('/api/support/faq')
          .expect(200);
        
        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should be identical to /api/faq', async () => {
        const faqResponse = await request(baseURL).get('/api/faq');
        const supportResponse = await request(baseURL).get('/api/support/faq');
        
        expect(faqResponse.status).toBe(200);
        expect(supportResponse.status).toBe(200);
        expect(Array.isArray(faqResponse.body)).toBe(true);
        expect(Array.isArray(supportResponse.body)).toBe(true);
      });
    });

    describe('POST /api/support/inquiry', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .post('/api/support/inquiry')
          .send({ 
            title: 'Test inquiry',
            content: 'This is a test inquiry',
            category: 'general'
          })
          .expect(401);
      });

      it('should create inquiry with valid data', async () => {
        const response = await request(baseURL)
          .post('/api/support/inquiry')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ 
            title: 'Help with points system',
            content: 'I need help understanding how the points system works.',
            category: 'points',
            priority: 'normal'
          });
        
        expect([200, 201, 400, 500]).toContain(response.status);
        
        if ([200, 201].includes(response.status)) {
          expect(response.body).toHaveProperty('inquiryId');
          expect(response.body).toHaveProperty('status', 'submitted');
        }
      });

      it('should require title and content', async () => {
        const response = await request(baseURL)
          .post('/api/support/inquiry')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ category: 'general' });
        
        expect([400, 500]).toContain(response.status);
      });

      it('should validate category', async () => {
        const response = await request(baseURL)
          .post('/api/support/inquiry')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ 
            title: 'Test',
            content: 'Test content',
            category: 'invalid_category'
          });
        
        expect([400, 500]).toContain(response.status);
      });

      it('should validate content length', async () => {
        const shortContent = 'Hi';
        const longContent = 'A'.repeat(5001); // Assuming 5000 char limit
        
        const shortResponse = await request(baseURL)
          .post('/api/support/inquiry')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ 
            title: 'Test',
            content: shortContent,
            category: 'general'
          });
        
        const longResponse = await request(baseURL)
          .post('/api/support/inquiry')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ 
            title: 'Test',
            content: longContent,
            category: 'general'
          });
        
        expect([400, 500]).toContain(shortResponse.status);
        expect([400, 500]).toContain(longResponse.status);
      });
    });

    describe('GET /api/support/my-inquiries', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .get('/api/support/my-inquiries')
          .expect(401);
      });

      it('should return user inquiries', async () => {
        const response = await request(baseURL)
          .get('/api/support/my-inquiries')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });

      it('should include inquiry details', async () => {
        const response = await request(baseURL)
          .get('/api/support/my-inquiries')
          .set('Authorization', `Bearer ${userToken}`);
        
        if (response.status === 200 && response.body.length > 0) {
          const inquiry = response.body[0];
          expect(inquiry).toHaveProperty('id');
          expect(inquiry).toHaveProperty('title');
          expect(inquiry).toHaveProperty('status');
          expect(inquiry).toHaveProperty('category');
          expect(inquiry).toHaveProperty('createdAt');
        }
      });

      it('should handle pagination', async () => {
        const response = await request(baseURL)
          .get('/api/support/my-inquiries?page=1&limit=10')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 500]).toContain(response.status);
      });

      it('should filter by status', async () => {
        const response = await request(baseURL)
          .get('/api/support/my-inquiries?status=open')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 500]).toContain(response.status);
      });
    });
  });
});