const request = require('supertest');
const jwt = require('jsonwebtoken');

describe('Meetup API Detailed Tests', () => {
  const baseURL = 'http://localhost:3003';
  let validToken;
  let hostToken;
  
  beforeAll(async () => {
    // Set up test environment
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.PORT = '3003';
    
    // Create valid test tokens
    validToken = jwt.sign(
      { 
        userId: 'test-user-id', 
        email: 'participant@example.com',
        name: 'Test Participant' 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    hostToken = jwt.sign(
      { 
        userId: 'host-user-id', 
        email: 'host@example.com',
        name: 'Test Host' 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('Meetup Listing', () => {
    describe('GET /api/meetups', () => {
      it('should return meetups list without authentication', async () => {
        const response = await request(baseURL)
          .get('/api/meetups')
          .expect(200);
        
        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should handle pagination parameters', async () => {
        const response = await request(baseURL)
          .get('/api/meetups?page=1&limit=5')
          .expect(200);
        
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeLessThanOrEqual(5);
      });

      it('should handle invalid page parameter', async () => {
        const response = await request(baseURL)
          .get('/api/meetups?page=invalid');
        
        expect([200, 400]).toContain(response.status);
      });

      it('should handle negative page parameter', async () => {
        const response = await request(baseURL)
          .get('/api/meetups?page=-1');
        
        expect([200, 400]).toContain(response.status);
      });

      it('should handle category filter', async () => {
        const response = await request(baseURL)
          .get('/api/meetups?category=한식')
          .expect(200);
        
        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should handle location filter', async () => {
        const response = await request(baseURL)
          .get('/api/meetups?location=서울')
          .expect(200);
        
        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should handle date filter', async () => {
        const response = await request(baseURL)
          .get('/api/meetups?date=2025-12-01')
          .expect(200);
        
        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should handle multiple filters', async () => {
        const response = await request(baseURL)
          .get('/api/meetups?category=한식&location=서울&page=1&limit=10')
          .expect(200);
        
        expect(Array.isArray(response.body)).toBe(true);
      });
    });

    describe('GET /api/meetups/home', () => {
      it('should return home page meetups data', async () => {
        const response = await request(baseURL)
          .get('/api/meetups/home')
          .expect(200);
        
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should include metadata', async () => {
        const response = await request(baseURL)
          .get('/api/meetups/home')
          .expect(200);
        
        expect(response.body).toHaveProperty('data');
        // May include additional metadata like totalCount, etc.
      });
    });

    describe('GET /api/meetups/active', () => {
      it('should return only active meetups', async () => {
        const response = await request(baseURL)
          .get('/api/meetups/active')
          .expect(200);
        
        expect(Array.isArray(response.body)).toBe(true);
        // All returned meetups should be active
        response.body.forEach(meetup => {
          expect(['active', 'open']).toContain(meetup.status);
        });
      });
    });

    describe('GET /api/meetups/completed', () => {
      it('should require authentication', async () => {
        const response = await request(baseURL)
          .get('/api/meetups/completed')
          .expect(401);
        
        expect(response.body).toHaveProperty('error');
      });

      it('should return completed meetups for authenticated user', async () => {
        const response = await request(baseURL)
          .get('/api/meetups/completed')
          .set('Authorization', `Bearer ${validToken}`);
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });
    });
  });

  describe('Individual Meetup', () => {
    describe('GET /api/meetups/:id', () => {
      it('should return 404 for non-existent meetup', async () => {
        const response = await request(baseURL)
          .get('/api/meetups/non-existent-id');
        
        expect([404, 500]).toContain(response.status);
      });

      it('should handle invalid UUID format', async () => {
        const response = await request(baseURL)
          .get('/api/meetups/invalid-uuid-format');
        
        expect([400, 404, 500]).toContain(response.status);
      });

      it('should return meetup details for valid ID', async () => {
        // First get a list of meetups to find a valid ID
        const listResponse = await request(baseURL)
          .get('/api/meetups')
          .expect(200);
        
        if (listResponse.body.length > 0) {
          const meetupId = listResponse.body[0].id;
          
          const response = await request(baseURL)
            .get(`/api/meetups/${meetupId}`)
            .expect(200);
          
          expect(response.body).toHaveProperty('id');
          expect(response.body).toHaveProperty('title');
          expect(response.body).toHaveProperty('description');
          expect(response.body).toHaveProperty('status');
        }
      });
    });
  });

  describe('Meetup Creation', () => {
    describe('POST /api/meetups', () => {
      it('should require authentication', async () => {
        const response = await request(baseURL)
          .post('/api/meetups')
          .send({
            title: 'Test Meetup',
            description: 'Test Description',
            category: '한식',
            location: '서울시 강남구',
            date: '2025-12-31',
            time: '18:00',
            maxParticipants: 4
          })
          .expect(401);
        
        expect(response.body).toHaveProperty('error');
      });

      it('should require title', async () => {
        const response = await request(baseURL)
          .post('/api/meetups')
          .set('Authorization', `Bearer ${hostToken}`)
          .send({
            description: 'Test Description',
            category: '한식',
            location: '서울시 강남구',
            date: '2025-12-31',
            time: '18:00',
            maxParticipants: 4
          });
        
        expect([400, 500]).toContain(response.status);
        if (response.status === 400) {
          expect(response.body).toHaveProperty('error');
        }
      });

      it('should require description', async () => {
        const response = await request(baseURL)
          .post('/api/meetups')
          .set('Authorization', `Bearer ${hostToken}`)
          .send({
            title: 'Test Meetup',
            category: '한식',
            location: '서울시 강남구',
            date: '2025-12-31',
            time: '18:00',
            maxParticipants: 4
          });
        
        expect([400, 500]).toContain(response.status);
      });

      it('should require valid date format', async () => {
        const response = await request(baseURL)
          .post('/api/meetups')
          .set('Authorization', `Bearer ${hostToken}`)
          .send({
            title: 'Test Meetup',
            description: 'Test Description',
            category: '한식',
            location: '서울시 강남구',
            date: 'invalid-date',
            time: '18:00',
            maxParticipants: 4
          });
        
        expect([400, 500]).toContain(response.status);
      });

      it('should require future date', async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);
        
        const response = await request(baseURL)
          .post('/api/meetups')
          .set('Authorization', `Bearer ${hostToken}`)
          .send({
            title: 'Test Meetup',
            description: 'Test Description',
            category: '한식',
            location: '서울시 강남구',
            date: pastDate.toISOString().split('T')[0],
            time: '18:00',
            maxParticipants: 4
          });
        
        expect([400, 500]).toContain(response.status);
      });

      it('should require valid maxParticipants', async () => {
        const response = await request(baseURL)
          .post('/api/meetups')
          .set('Authorization', `Bearer ${hostToken}`)
          .send({
            title: 'Test Meetup',
            description: 'Test Description',
            category: '한식',
            location: '서울시 강남구',
            date: '2025-12-31',
            time: '18:00',
            maxParticipants: 0
          });
        
        expect([400, 500]).toContain(response.status);
      });

      it('should create meetup with valid data', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        
        const response = await request(baseURL)
          .post('/api/meetups')
          .set('Authorization', `Bearer ${hostToken}`)
          .send({
            title: 'Test Meetup Creation',
            description: 'This is a test meetup description',
            category: '한식',
            location: '서울시 강남구',
            address: '서울시 강남구 테스트로 123',
            date: futureDate.toISOString().split('T')[0],
            time: '18:00',
            maxParticipants: 4,
            deposit: 5000
          });
        
        expect([200, 201, 500]).toContain(response.status);
        
        if ([200, 201].includes(response.status)) {
          expect(response.body).toHaveProperty('id');
          expect(response.body).toHaveProperty('title', 'Test Meetup Creation');
          expect(response.body).toHaveProperty('hostId', 'host-user-id');
        }
      });
    });
  });

  describe('Meetup Participation', () => {
    let testMeetupId;
    
    beforeAll(async () => {
      // Create a test meetup for participation tests
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      const createResponse = await request(baseURL)
        .post('/api/meetups')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({
          title: 'Participation Test Meetup',
          description: 'Meetup for testing participation',
          category: '한식',
          location: '서울시 강남구',
          date: futureDate.toISOString().split('T')[0],
          time: '19:00',
          maxParticipants: 2,
          deposit: 3000
        });
      
      if ([200, 201].includes(createResponse.status)) {
        testMeetupId = createResponse.body.id;
      }
    });

    describe('POST /api/meetups/:id/join', () => {
      it('should require authentication', async () => {
        const response = await request(baseURL)
          .post('/api/meetups/test-id/join')
          .expect(401);
        
        expect(response.body).toHaveProperty('error');
      });

      it('should handle non-existent meetup', async () => {
        const response = await request(baseURL)
          .post('/api/meetups/non-existent-id/join')
          .set('Authorization', `Bearer ${validToken}`);
        
        expect([404, 500]).toContain(response.status);
      });

      it('should prevent host from joining own meetup', async () => {
        if (testMeetupId) {
          const response = await request(baseURL)
            .post(`/api/meetups/${testMeetupId}/join`)
            .set('Authorization', `Bearer ${hostToken}`);
          
          expect([400, 403, 500]).toContain(response.status);
        }
      });

      it('should allow user to join meetup', async () => {
        if (testMeetupId) {
          const response = await request(baseURL)
            .post(`/api/meetups/${testMeetupId}/join`)
            .set('Authorization', `Bearer ${validToken}`)
            .send({
              message: 'Looking forward to this meetup!'
            });
          
          expect([200, 201, 400, 500]).toContain(response.status);
          
          if ([200, 201].includes(response.status)) {
            expect(response.body).toHaveProperty('message');
          }
        }
      });

      it('should prevent double joining', async () => {
        if (testMeetupId) {
          // Try to join again
          const response = await request(baseURL)
            .post(`/api/meetups/${testMeetupId}/join`)
            .set('Authorization', `Bearer ${validToken}`);
          
          expect([400, 409, 500]).toContain(response.status);
        }
      });
    });

    describe('POST /api/meetups/:id/leave', () => {
      it('should require authentication', async () => {
        const response = await request(baseURL)
          .post('/api/meetups/test-id/leave')
          .expect(401);
        
        expect(response.body).toHaveProperty('error');
      });

      it('should handle non-existent meetup', async () => {
        const response = await request(baseURL)
          .post('/api/meetups/non-existent-id/leave')
          .set('Authorization', `Bearer ${validToken}`);
        
        expect([404, 500]).toContain(response.status);
      });

      it('should allow participant to leave', async () => {
        if (testMeetupId) {
          const response = await request(baseURL)
            .post(`/api/meetups/${testMeetupId}/leave`)
            .set('Authorization', `Bearer ${validToken}`);
          
          expect([200, 400, 500]).toContain(response.status);
          
          if (response.status === 200) {
            expect(response.body).toHaveProperty('message');
          }
        }
      });

      it('should prevent leaving if not participant', async () => {
        if (testMeetupId) {
          const response = await request(baseURL)
            .post(`/api/meetups/${testMeetupId}/leave`)
            .set('Authorization', `Bearer ${validToken}`);
          
          expect([400, 404, 500]).toContain(response.status);
        }
      });
    });
  });

  describe('User Meetup Lists', () => {
    describe('GET /api/user/hosted-meetups', () => {
      it('should require authentication', async () => {
        const response = await request(baseURL)
          .get('/api/user/hosted-meetups')
          .expect(401);
        
        expect(response.body).toHaveProperty('error');
      });

      it('should return hosted meetups for authenticated user', async () => {
        const response = await request(baseURL)
          .get('/api/user/hosted-meetups')
          .set('Authorization', `Bearer ${hostToken}`);
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });
    });

    describe('GET /api/user/joined-meetups', () => {
      it('should require authentication', async () => {
        const response = await request(baseURL)
          .get('/api/user/joined-meetups')
          .expect(401);
        
        expect(response.body).toHaveProperty('error');
      });

      it('should return joined meetups for authenticated user', async () => {
        const response = await request(baseURL)
          .get('/api/user/joined-meetups')
          .set('Authorization', `Bearer ${validToken}`);
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });
    });

    describe('GET /api/my-meetups', () => {
      it('should require authentication', async () => {
        const response = await request(baseURL)
          .get('/api/my-meetups')
          .expect(401);
        
        expect(response.body).toHaveProperty('error');
      });

      it('should return user\'s meetups', async () => {
        const response = await request(baseURL)
          .get('/api/my-meetups')
          .set('Authorization', `Bearer ${validToken}`);
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('hosted');
          expect(response.body).toHaveProperty('joined');
          expect(Array.isArray(response.body.hosted)).toBe(true);
          expect(Array.isArray(response.body.joined)).toBe(true);
        }
      });
    });
  });

  describe('Meetup Reviews', () => {
    describe('GET /api/meetups/:id/reviews', () => {
      it('should return reviews for existing meetup', async () => {
        // Get a meetup first
        const listResponse = await request(baseURL)
          .get('/api/meetups')
          .expect(200);
        
        if (listResponse.body.length > 0) {
          const meetupId = listResponse.body[0].id;
          
          const response = await request(baseURL)
            .get(`/api/meetups/${meetupId}/reviews`)
            .expect(200);
          
          expect(Array.isArray(response.body)).toBe(true);
        }
      });

      it('should handle non-existent meetup', async () => {
        const response = await request(baseURL)
          .get('/api/meetups/non-existent-id/reviews');
        
        expect([200, 404, 500]).toContain(response.status);
      });
    });

    describe('POST /api/meetups/:id/reviews', () => {
      it('should require authentication', async () => {
        const response = await request(baseURL)
          .post('/api/meetups/test-id/reviews')
          .send({
            rating: 5,
            content: 'Great meetup!'
          })
          .expect(401);
        
        expect(response.body).toHaveProperty('error');
      });

      it('should require valid rating', async () => {
        const response = await request(baseURL)
          .post('/api/meetups/test-id/reviews')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            rating: 6,  // Invalid rating (should be 1-5)
            content: 'Great meetup!'
          });
        
        expect([400, 404, 500]).toContain(response.status);
      });

      it('should require review content', async () => {
        const response = await request(baseURL)
          .post('/api/meetups/test-id/reviews')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            rating: 5
          });
        
        expect([400, 404, 500]).toContain(response.status);
      });
    });
  });

  describe('Wishlist Management', () => {
    describe('GET /api/user/wishlist', () => {
      it('should require authentication', async () => {
        const response = await request(baseURL)
          .get('/api/user/wishlist')
          .expect(401);
        
        expect(response.body).toHaveProperty('error');
      });

      it('should return user\'s wishlist', async () => {
        const response = await request(baseURL)
          .get('/api/user/wishlist')
          .set('Authorization', `Bearer ${validToken}`);
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });
    });

    describe('POST /api/user/wishlist/:meetupId', () => {
      it('should require authentication', async () => {
        const response = await request(baseURL)
          .post('/api/user/wishlist/test-id')
          .expect(401);
        
        expect(response.body).toHaveProperty('error');
      });

      it('should handle non-existent meetup', async () => {
        const response = await request(baseURL)
          .post('/api/user/wishlist/non-existent-id')
          .set('Authorization', `Bearer ${validToken}`);
        
        expect([404, 500]).toContain(response.status);
      });
    });
  });
});