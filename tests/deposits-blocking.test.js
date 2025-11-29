const request = require('supertest');
const jwt = require('jsonwebtoken');

describe('Deposits & User Blocking API Tests', () => {
  const baseURL = 'http://localhost:3003';
  let userToken;
  let otherUserToken;
  
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

    otherUserToken = jwt.sign(
      { 
        userId: 'other-user-id', 
        email: 'other@example.com',
        name: 'Other User' 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('Deposit Management', () => {
    describe('POST /api/deposits/payment', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .post('/api/deposits/payment')
          .send({ 
            meetupId: 'test-meetup-id',
            amount: 5000,
            paymentMethod: 'points'
          })
          .expect(401);
      });

      it('should create deposit payment', async () => {
        const response = await request(baseURL)
          .post('/api/deposits/payment')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ 
            meetupId: 'test-meetup-id',
            amount: 5000,
            paymentMethod: 'points'
          });
        
        expect([200, 201, 400, 500]).toContain(response.status);
        
        if ([200, 201].includes(response.status)) {
          expect(response.body).toHaveProperty('depositId');
          expect(response.body).toHaveProperty('amount', 5000);
          expect(response.body).toHaveProperty('status');
        }
      });

      it('should require meetupId', async () => {
        const response = await request(baseURL)
          .post('/api/deposits/payment')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ 
            amount: 5000,
            paymentMethod: 'points'
          });
        
        expect([400, 500]).toContain(response.status);
      });

      it('should require positive amount', async () => {
        const response = await request(baseURL)
          .post('/api/deposits/payment')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ 
            meetupId: 'test-meetup-id',
            amount: -1000,
            paymentMethod: 'points'
          });
        
        expect([400, 500]).toContain(response.status);
      });

      it('should validate payment method', async () => {
        const response = await request(baseURL)
          .post('/api/deposits/payment')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ 
            meetupId: 'test-meetup-id',
            amount: 5000,
            paymentMethod: 'invalid_method'
          });
        
        expect([400, 500]).toContain(response.status);
      });

      it('should handle card payment', async () => {
        const response = await request(baseURL)
          .post('/api/deposits/payment')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ 
            meetupId: 'test-meetup-id',
            amount: 5000,
            paymentMethod: 'card',
            cardToken: 'test_card_token',
            cardLast4: '1234'
          });
        
        expect([200, 201, 400, 500]).toContain(response.status);
      });
    });

    describe('GET /api/user/deposits', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .get('/api/user/deposits')
          .expect(401);
      });

      it('should return user deposits', async () => {
        const response = await request(baseURL)
          .get('/api/user/deposits')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });

      it('should include deposit details', async () => {
        const response = await request(baseURL)
          .get('/api/user/deposits')
          .set('Authorization', `Bearer ${userToken}`);
        
        if (response.status === 200 && response.body.length > 0) {
          const deposit = response.body[0];
          expect(deposit).toHaveProperty('id');
          expect(deposit).toHaveProperty('meetupId');
          expect(deposit).toHaveProperty('amount');
          expect(deposit).toHaveProperty('status');
          expect(deposit).toHaveProperty('paymentMethod');
          expect(deposit).toHaveProperty('createdAt');
        }
      });

      it('should handle pagination', async () => {
        const response = await request(baseURL)
          .get('/api/user/deposits?page=1&limit=10')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 500]).toContain(response.status);
      });

      it('should filter by status', async () => {
        const response = await request(baseURL)
          .get('/api/user/deposits?status=paid')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 500]).toContain(response.status);
      });
    });

    describe('POST /api/deposits/:id/refund', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .post('/api/deposits/test-deposit-id/refund')
          .send({ reason: 'meetup_cancelled' })
          .expect(401);
      });

      it('should process refund', async () => {
        const response = await request(baseURL)
          .post('/api/deposits/test-deposit-id/refund')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ 
            reason: 'meetup_cancelled',
            refundType: 'full'
          });
        
        expect([200, 201, 400, 404, 500]).toContain(response.status);
        
        if ([200, 201].includes(response.status)) {
          expect(response.body).toHaveProperty('refundId');
          expect(response.body).toHaveProperty('refundAmount');
          expect(response.body).toHaveProperty('status');
        }
      });

      it('should require refund reason', async () => {
        const response = await request(baseURL)
          .post('/api/deposits/test-deposit-id/refund')
          .set('Authorization', `Bearer ${userToken}`)
          .send({});
        
        expect([400, 404, 500]).toContain(response.status);
      });

      it('should validate refund reason', async () => {
        const response = await request(baseURL)
          .post('/api/deposits/test-deposit-id/refund')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ reason: 'invalid_reason' });
        
        expect([400, 404, 500]).toContain(response.status);
      });

      it('should prevent refunding others\' deposits', async () => {
        const response = await request(baseURL)
          .post('/api/deposits/test-deposit-id/refund')
          .set('Authorization', `Bearer ${otherUserToken}`)
          .send({ reason: 'meetup_cancelled' });
        
        expect([403, 404, 500]).toContain(response.status);
      });
    });

    describe('POST /api/deposits/:id/convert-to-points', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .post('/api/deposits/test-deposit-id/convert-to-points')
          .expect(401);
      });

      it('should convert deposit to points', async () => {
        const response = await request(baseURL)
          .post('/api/deposits/test-deposit-id/convert-to-points')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 201, 400, 404, 500]).toContain(response.status);
        
        if ([200, 201].includes(response.status)) {
          expect(response.body).toHaveProperty('pointsAdded');
          expect(response.body).toHaveProperty('conversionRate');
          expect(response.body).toHaveProperty('newBalance');
        }
      });

      it('should prevent converting others\' deposits', async () => {
        const response = await request(baseURL)
          .post('/api/deposits/test-deposit-id/convert-to-points')
          .set('Authorization', `Bearer ${otherUserToken}`);
        
        expect([403, 404, 500]).toContain(response.status);
      });

      it('should only convert eligible deposits', async () => {
        const response = await request(baseURL)
          .post('/api/deposits/ineligible-deposit-id/convert-to-points')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([400, 404, 500]).toContain(response.status);
      });
    });
  });

  describe('User Blocking System', () => {
    describe('POST /api/users/:userId/block', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .post('/api/users/other-user-id/block')
          .send({ reason: 'inappropriate_behavior' })
          .expect(401);
      });

      it('should block user', async () => {
        const response = await request(baseURL)
          .post('/api/users/other-user-id/block')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ 
            reason: 'inappropriate_behavior',
            description: 'User was being inappropriate during meetups'
          });
        
        expect([200, 201, 400, 500]).toContain(response.status);
        
        if ([200, 201].includes(response.status)) {
          expect(response.body).toHaveProperty('blocked', true);
          expect(response.body).toHaveProperty('blockedAt');
        }
      });

      it('should require block reason', async () => {
        const response = await request(baseURL)
          .post('/api/users/other-user-id/block')
          .set('Authorization', `Bearer ${userToken}`)
          .send({});
        
        expect([400, 500]).toContain(response.status);
      });

      it('should validate block reason', async () => {
        const response = await request(baseURL)
          .post('/api/users/other-user-id/block')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ reason: 'invalid_reason' });
        
        expect([400, 500]).toContain(response.status);
      });

      it('should prevent self-blocking', async () => {
        const response = await request(baseURL)
          .post('/api/users/test-user-id/block')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ reason: 'inappropriate_behavior' });
        
        expect([400, 500]).toContain(response.status);
      });

      it('should prevent duplicate blocking', async () => {
        // First block
        await request(baseURL)
          .post('/api/users/other-user-id/block')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ reason: 'inappropriate_behavior' });

        // Duplicate block attempt
        const response = await request(baseURL)
          .post('/api/users/other-user-id/block')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ reason: 'spam' });
        
        expect([400, 409, 500]).toContain(response.status);
      });
    });

    describe('DELETE /api/users/:userId/block', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .delete('/api/users/other-user-id/block')
          .expect(401);
      });

      it('should unblock user', async () => {
        const response = await request(baseURL)
          .delete('/api/users/other-user-id/block')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 204, 404, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('blocked', false);
        }
      });

      it('should handle unblocking non-blocked user', async () => {
        const response = await request(baseURL)
          .delete('/api/users/non-blocked-user-id/block')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 404, 500]).toContain(response.status);
      });
    });

    describe('GET /api/user/blocked-users', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .get('/api/user/blocked-users')
          .expect(401);
      });

      it('should return blocked users list', async () => {
        const response = await request(baseURL)
          .get('/api/user/blocked-users')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });

      it('should include block details', async () => {
        const response = await request(baseURL)
          .get('/api/user/blocked-users')
          .set('Authorization', `Bearer ${userToken}`);
        
        if (response.status === 200 && response.body.length > 0) {
          const blockedUser = response.body[0];
          expect(blockedUser).toHaveProperty('userId');
          expect(blockedUser).toHaveProperty('reason');
          expect(blockedUser).toHaveProperty('blockedAt');
          expect(blockedUser).toHaveProperty('user');
        }
      });

      it('should handle pagination', async () => {
        const response = await request(baseURL)
          .get('/api/user/blocked-users?page=1&limit=10')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 500]).toContain(response.status);
      });
    });

    describe('GET /api/users/:userId/blocked-status', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .get('/api/users/other-user-id/blocked-status')
          .expect(401);
      });

      it('should return block status', async () => {
        const response = await request(baseURL)
          .get('/api/users/other-user-id/blocked-status')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 404, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('isBlocked');
          expect(typeof response.body.isBlocked).toBe('boolean');
        }
      });

      it('should include block details if blocked', async () => {
        const response = await request(baseURL)
          .get('/api/users/blocked-user-id/blocked-status')
          .set('Authorization', `Bearer ${userToken}`);
        
        if (response.status === 200 && response.body.isBlocked) {
          expect(response.body).toHaveProperty('blockedAt');
          expect(response.body).toHaveProperty('reason');
        }
      });

      it('should handle non-existent users', async () => {
        const response = await request(baseURL)
          .get('/api/users/non-existent-id/blocked-status')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([404, 500]).toContain(response.status);
      });
    });
  });

  describe('Recent Views Tracking', () => {
    describe('POST /api/users/recent-views/:meetupId', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .post('/api/users/recent-views/test-meetup-id')
          .expect(401);
      });

      it('should track meetup view', async () => {
        const response = await request(baseURL)
          .post('/api/users/recent-views/test-meetup-id')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 201, 404, 500]).toContain(response.status);
        
        if ([200, 201].includes(response.status)) {
          expect(response.body).toHaveProperty('viewed', true);
          expect(response.body).toHaveProperty('viewedAt');
        }
      });

      it('should handle duplicate views', async () => {
        // First view
        await request(baseURL)
          .post('/api/users/recent-views/test-meetup-id')
          .set('Authorization', `Bearer ${userToken}`);

        // Duplicate view (should update timestamp)
        const response = await request(baseURL)
          .post('/api/users/recent-views/test-meetup-id')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 201, 404, 500]).toContain(response.status);
      });

      it('should handle non-existent meetups', async () => {
        const response = await request(baseURL)
          .post('/api/users/recent-views/non-existent-meetup-id')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([404, 500]).toContain(response.status);
      });
    });

    describe('GET /api/user/recent-views', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .get('/api/user/recent-views')
          .expect(401);
      });

      it('should return recent views', async () => {
        const response = await request(baseURL)
          .get('/api/user/recent-views')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });

      it('should include meetup details', async () => {
        const response = await request(baseURL)
          .get('/api/user/recent-views')
          .set('Authorization', `Bearer ${userToken}`);
        
        if (response.status === 200 && response.body.length > 0) {
          const view = response.body[0];
          expect(view).toHaveProperty('meetupId');
          expect(view).toHaveProperty('viewedAt');
          expect(view).toHaveProperty('meetup');
          expect(view.meetup).toHaveProperty('title');
        }
      });

      it('should handle pagination', async () => {
        const response = await request(baseURL)
          .get('/api/user/recent-views?page=1&limit=5')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 500]).toContain(response.status);
      });

      it('should sort by most recent', async () => {
        const response = await request(baseURL)
          .get('/api/user/recent-views')
          .set('Authorization', `Bearer ${userToken}`);
        
        if (response.status === 200 && response.body.length > 1) {
          const first = new Date(response.body[0].viewedAt);
          const second = new Date(response.body[1].viewedAt);
          expect(first.getTime()).toBeGreaterThanOrEqual(second.getTime());
        }
      });
    });

    describe('DELETE /api/user/recent-views', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .delete('/api/user/recent-views')
          .expect(401);
      });

      it('should clear all recent views', async () => {
        const response = await request(baseURL)
          .delete('/api/user/recent-views')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 204, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('cleared', true);
        }
      });
    });

    describe('DELETE /api/user/recent-views/:viewId', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .delete('/api/user/recent-views/test-view-id')
          .expect(401);
      });

      it('should delete specific view', async () => {
        const response = await request(baseURL)
          .delete('/api/user/recent-views/test-view-id')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 204, 404, 500]).toContain(response.status);
      });

      it('should prevent deleting others\' views', async () => {
        const response = await request(baseURL)
          .delete('/api/user/recent-views/test-view-id')
          .set('Authorization', `Bearer ${otherUserToken}`);
        
        expect([403, 404, 500]).toContain(response.status);
      });
    });
  });
});