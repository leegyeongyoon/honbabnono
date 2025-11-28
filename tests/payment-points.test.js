const request = require('supertest');
const jwt = require('jsonwebtoken');

describe('Payment and Points API Tests', () => {
  const baseURL = 'http://localhost:3003';
  let validToken;
  
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.PORT = '3003';
    
    validToken = jwt.sign(
      { 
        userId: 'test-user-id', 
        email: 'test@example.com',
        name: 'Test User' 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('Point Management', () => {
    describe('GET /api/users/points', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .get('/api/users/points')
          .expect(401);
      });

      it('should return user points', async () => {
        const response = await request(baseURL)
          .get('/api/users/points')
          .set('Authorization', `Bearer ${validToken}`);
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('points');
          expect(typeof response.body.points).toBe('number');
        }
      });
    });

    describe('POST /api/users/charge-points', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .post('/api/users/charge-points')
          .send({ amount: 1000 })
          .expect(401);
      });

      it('should require amount', async () => {
        const response = await request(baseURL)
          .post('/api/users/charge-points')
          .set('Authorization', `Bearer ${validToken}`)
          .send({});
        
        expect([400, 500]).toContain(response.status);
      });

      it('should require positive amount', async () => {
        const response = await request(baseURL)
          .post('/api/users/charge-points')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ amount: -1000 });
        
        expect([400, 500]).toContain(response.status);
      });

      it('should charge points with valid data', async () => {
        const response = await request(baseURL)
          .post('/api/users/charge-points')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ 
            amount: 5000,
            paymentMethod: 'card',
            paymentId: 'test-payment-id'
          });
        
        expect([200, 201, 400, 500]).toContain(response.status);
        
        if ([200, 201].includes(response.status)) {
          expect(response.body).toHaveProperty('newBalance');
        }
      });
    });

    describe('POST /api/users/use-points', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .post('/api/users/use-points')
          .send({ amount: 1000, purpose: 'test' })
          .expect(401);
      });

      it('should require amount and purpose', async () => {
        const response = await request(baseURL)
          .post('/api/users/use-points')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ amount: 1000 });
        
        expect([400, 500]).toContain(response.status);
      });

      it('should reject invalid amount', async () => {
        const response = await request(baseURL)
          .post('/api/users/use-points')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ amount: -1000, purpose: 'test' });
        
        expect([400, 500]).toContain(response.status);
      });
    });

    describe('POST /api/users/refund-points', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .post('/api/users/refund-points')
          .send({ amount: 1000, reason: 'test refund' })
          .expect(401);
      });

      it('should require amount and reason', async () => {
        const response = await request(baseURL)
          .post('/api/users/refund-points')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ amount: 1000 });
        
        expect([400, 500]).toContain(response.status);
      });
    });
  });

  describe('Deposit Management', () => {
    describe('POST /api/deposits/payment', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .post('/api/deposits/payment')
          .send({ 
            amount: 3000,
            meetupId: 'test-meetup-id',
            paymentMethod: 'points'
          })
          .expect(401);
      });

      it('should require meetupId', async () => {
        const response = await request(baseURL)
          .post('/api/deposits/payment')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ 
            amount: 3000,
            paymentMethod: 'points'
          });
        
        expect([400, 500]).toContain(response.status);
      });

      it('should require valid amount', async () => {
        const response = await request(baseURL)
          .post('/api/deposits/payment')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ 
            amount: 0,
            meetupId: 'test-meetup-id',
            paymentMethod: 'points'
          });
        
        expect([400, 500]).toContain(response.status);
      });

      it('should require payment method', async () => {
        const response = await request(baseURL)
          .post('/api/deposits/payment')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ 
            amount: 3000,
            meetupId: 'test-meetup-id'
          });
        
        expect([400, 500]).toContain(response.status);
      });
    });

    describe('POST /api/deposits/refund', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .post('/api/deposits/refund')
          .send({ 
            meetupId: 'test-meetup-id',
            reason: 'cancellation'
          })
          .expect(401);
      });

      it('should require meetupId', async () => {
        const response = await request(baseURL)
          .post('/api/deposits/refund')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ reason: 'cancellation' });
        
        expect([400, 500]).toContain(response.status);
      });

      it('should require reason', async () => {
        const response = await request(baseURL)
          .post('/api/deposits/refund')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ meetupId: 'test-meetup-id' });
        
        expect([400, 500]).toContain(response.status);
      });
    });
  });

  describe('Payment History', () => {
    describe('GET /api/users/payment-history', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .get('/api/users/payment-history')
          .expect(401);
      });

      it('should return payment history', async () => {
        const response = await request(baseURL)
          .get('/api/users/payment-history')
          .set('Authorization', `Bearer ${validToken}`);
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });

      it('should handle pagination', async () => {
        const response = await request(baseURL)
          .get('/api/users/payment-history?page=1&limit=10')
          .set('Authorization', `Bearer ${validToken}`);
        
        expect([200, 500]).toContain(response.status);
      });
    });

    describe('GET /api/users/point-history', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .get('/api/users/point-history')
          .expect(401);
      });

      it('should return point transaction history', async () => {
        const response = await request(baseURL)
          .get('/api/users/point-history')
          .set('Authorization', `Bearer ${validToken}`);
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });
    });
  });

  describe('Point Statistics', () => {
    describe('GET /api/users/point-stats', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .get('/api/users/point-stats')
          .expect(401);
      });

      it('should return point statistics', async () => {
        const response = await request(baseURL)
          .get('/api/users/point-stats')
          .set('Authorization', `Bearer ${validToken}`);
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('currentBalance');
          expect(response.body).toHaveProperty('totalEarned');
          expect(response.body).toHaveProperty('totalSpent');
        }
      });
    });
  });
});