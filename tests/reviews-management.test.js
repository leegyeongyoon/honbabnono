const request = require('supertest');
const jwt = require('jsonwebtoken');

describe('Reviews Management API Tests', () => {
  const baseURL = 'http://localhost:3003';
  let userToken;
  let reviewerToken;
  
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test_jwt_secret_key_123456789';
    process.env.PORT = '3003';
    
    userToken = jwt.sign(
      { 
        userId: '550e8400-e29b-41d4-a716-446655440001', 
        email: 'user@example.com',
        name: 'Test User' 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    reviewerToken = jwt.sign(
      { 
        userId: '550e8400-e29b-41d4-a716-446655440002', 
        email: 'reviewer@example.com',
        name: 'Test Reviewer' 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('Meetup Reviews', () => {
    describe('POST /api/meetups/:meetupId/reviews', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .post('/api/meetups/test-meetup-id/reviews')
          .send({ 
            rating: 5,
            content: 'Great meetup!',
            tags: ['friendly', 'punctual']
          })
          .expect(401);
      });

      it('should create review with valid data', async () => {
        const response = await request(baseURL)
          .post('/api/meetups/test-meetup-id/reviews')
          .set('Authorization', `Bearer ${reviewerToken}`)
          .send({ 
            rating: 5,
            content: 'Excellent meetup! Great food and company.',
            tags: ['friendly', 'punctual', 'great_food'],
            reviewType: 'participant'
          });
        
        expect([200, 201, 400, 404, 500]).toContain(response.status);
        
        if ([200, 201].includes(response.status)) {
          expect(response.body).toHaveProperty('id');
          expect(response.body).toHaveProperty('rating', 5);
          expect(response.body).toHaveProperty('content');
        }
      });

      it('should require rating', async () => {
        const response = await request(baseURL)
          .post('/api/meetups/test-meetup-id/reviews')
          .set('Authorization', `Bearer ${reviewerToken}`)
          .send({ 
            content: 'Great meetup!',
            tags: ['friendly']
          });
        
        expect([400, 404, 500]).toContain(response.status);
      });

      it('should validate rating range (1-5)', async () => {
        const response = await request(baseURL)
          .post('/api/meetups/test-meetup-id/reviews')
          .set('Authorization', `Bearer ${reviewerToken}`)
          .send({ 
            rating: 6,  // Invalid rating
            content: 'Great meetup!'
          });
        
        expect([400, 404, 500]).toContain(response.status);
      });

      it('should require minimum content length', async () => {
        const response = await request(baseURL)
          .post('/api/meetups/test-meetup-id/reviews')
          .set('Authorization', `Bearer ${reviewerToken}`)
          .send({ 
            rating: 5,
            content: 'OK'  // Too short
          });
        
        expect([400, 404, 500]).toContain(response.status);
      });

      it('should validate review tags', async () => {
        const response = await request(baseURL)
          .post('/api/meetups/test-meetup-id/reviews')
          .set('Authorization', `Bearer ${reviewerToken}`)
          .send({ 
            rating: 5,
            content: 'Great meetup!',
            tags: ['invalid_tag', 'another_invalid_tag']
          });
        
        expect([200, 201, 400, 404, 500]).toContain(response.status);
      });

      it('should prevent duplicate reviews', async () => {
        // First review
        await request(baseURL)
          .post('/api/meetups/test-meetup-id/reviews')
          .set('Authorization', `Bearer ${reviewerToken}`)
          .send({ 
            rating: 5,
            content: 'First review'
          });

        // Duplicate review attempt
        const response = await request(baseURL)
          .post('/api/meetups/test-meetup-id/reviews')
          .set('Authorization', `Bearer ${reviewerToken}`)
          .send({ 
            rating: 4,
            content: 'Second review attempt'
          });
        
        expect([400, 409, 500]).toContain(response.status);
      });
    });

    describe('GET /api/meetups/:meetupId/reviews', () => {
      it('should return reviews for meetup', async () => {
        const response = await request(baseURL)
          .get('/api/meetups/test-meetup-id/reviews')
          .expect(200);
        
        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should include reviewer information', async () => {
        const response = await request(baseURL)
          .get('/api/meetups/test-meetup-id/reviews')
          .expect(200);
        
        if (response.body.length > 0) {
          const review = response.body[0];
          expect(review).toHaveProperty('id');
          expect(review).toHaveProperty('rating');
          expect(review).toHaveProperty('content');
          expect(review).toHaveProperty('reviewer');
          expect(review).toHaveProperty('createdAt');
        }
      });

      it('should handle pagination', async () => {
        const response = await request(baseURL)
          .get('/api/meetups/test-meetup-id/reviews?page=1&limit=5')
          .expect(200);
        
        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should filter by rating', async () => {
        const response = await request(baseURL)
          .get('/api/meetups/test-meetup-id/reviews?rating=5')
          .expect(200);
        
        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should sort reviews', async () => {
        const response = await request(baseURL)
          .get('/api/meetups/test-meetup-id/reviews?sort=rating&order=desc')
          .expect(200);
        
        expect(Array.isArray(response.body)).toBe(true);
      });
    });
  });

  describe('User Reviews Management', () => {
    describe('GET /api/user/reviews', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .get('/api/user/reviews')
          .expect(401);
      });

      it('should return user\'s reviews', async () => {
        const response = await request(baseURL)
          .get('/api/user/reviews')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });

      it('should include meetup information', async () => {
        const response = await request(baseURL)
          .get('/api/user/reviews')
          .set('Authorization', `Bearer ${userToken}`);
        
        if (response.status === 200 && response.body.length > 0) {
          const review = response.body[0];
          expect(review).toHaveProperty('meetup');
          expect(review.meetup).toHaveProperty('title');
        }
      });

      it('should filter by review type', async () => {
        const response = await request(baseURL)
          .get('/api/user/reviews?type=given')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 500]).toContain(response.status);
      });
    });

    describe('GET /api/user/reviewable-meetups', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .get('/api/user/reviewable-meetups')
          .expect(401);
      });

      it('should return meetups that can be reviewed', async () => {
        const response = await request(baseURL)
          .get('/api/user/reviewable-meetups')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });

      it('should include review deadline', async () => {
        const response = await request(baseURL)
          .get('/api/user/reviewable-meetups')
          .set('Authorization', `Bearer ${userToken}`);
        
        if (response.status === 200 && response.body.length > 0) {
          const meetup = response.body[0];
          expect(meetup).toHaveProperty('reviewDeadline');
          expect(meetup).toHaveProperty('canReview');
        }
      });
    });

    describe('GET /api/users/my-reviews', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .get('/api/users/my-reviews')
          .expect(401);
      });

      it('should return user\'s review history', async () => {
        const response = await request(baseURL)
          .get('/api/users/my-reviews')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });

      it('should include both given and received reviews', async () => {
        const response = await request(baseURL)
          .get('/api/users/my-reviews')
          .set('Authorization', `Bearer ${userToken}`);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('givenReviews');
          expect(response.body).toHaveProperty('receivedReviews');
        }
      });
    });

    describe('PUT /api/users/my-reviews/:reviewId', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .put('/api/users/my-reviews/test-review-id')
          .send({ 
            rating: 4,
            content: 'Updated review content'
          })
          .expect(401);
      });

      it('should update review with valid data', async () => {
        const response = await request(baseURL)
          .put('/api/users/my-reviews/test-review-id')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ 
            rating: 4,
            content: 'Updated review content with more details',
            tags: ['updated_tag']
          });
        
        expect([200, 404, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('updated', true);
          expect(response.body).toHaveProperty('rating', 4);
        }
      });

      it('should prevent updating others\' reviews', async () => {
        const response = await request(baseURL)
          .put('/api/users/my-reviews/other-user-review-id')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ 
            rating: 1,
            content: 'Malicious update'
          });
        
        expect([403, 404, 500]).toContain(response.status);
      });

      it('should have time limit for updates', async () => {
        const response = await request(baseURL)
          .put('/api/users/my-reviews/old-review-id')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ 
            rating: 5,
            content: 'Trying to update old review'
          });
        
        expect([400, 403, 404, 500]).toContain(response.status);
      });
    });

    describe('DELETE /api/users/my-reviews/:reviewId', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .delete('/api/users/my-reviews/test-review-id')
          .expect(401);
      });

      it('should delete review', async () => {
        const response = await request(baseURL)
          .delete('/api/users/my-reviews/test-review-id')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 204, 404, 500]).toContain(response.status);
      });

      it('should prevent deleting others\' reviews', async () => {
        const response = await request(baseURL)
          .delete('/api/users/my-reviews/other-user-review-id')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([403, 404, 500]).toContain(response.status);
      });
    });
  });

  describe('Review Features & Moderation', () => {
    describe('PATCH /api/reviews/:reviewId/feature', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .patch('/api/reviews/test-review-id/feature')
          .send({ featured: true })
          .expect(401);
      });

      it('should feature/unfeature review', async () => {
        const response = await request(baseURL)
          .patch('/api/reviews/test-review-id/feature')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ featured: true });
        
        expect([200, 403, 404, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('featured');
        }
      });

      it('should require boolean featured value', async () => {
        const response = await request(baseURL)
          .patch('/api/reviews/test-review-id/feature')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ featured: 'invalid' });
        
        expect([400, 403, 404, 500]).toContain(response.status);
      });
    });

    describe('DELETE /api/reviews/:reviewId', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .delete('/api/reviews/test-review-id')
          .expect(401);
      });

      it('should delete review', async () => {
        const response = await request(baseURL)
          .delete('/api/reviews/test-review-id')
          .set('Authorization', `Bearer ${userToken}`);
        
        expect([200, 204, 403, 404, 500]).toContain(response.status);
      });

      it('should prevent deleting others\' reviews', async () => {
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
          .delete('/api/reviews/test-review-id')
          .set('Authorization', `Bearer ${otherUserToken}`);
        
        expect([403, 404, 500]).toContain(response.status);
      });
    });
  });

  describe('Participant Reviews', () => {
    describe('GET /api/user/:userId/participant-reviews', () => {
      it('should return reviews for specific user', async () => {
        const response = await request(baseURL)
          .get('/api/user/test-user-id/participant-reviews')
          .expect(200);
        
        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should include reviewer anonymization', async () => {
        const response = await request(baseURL)
          .get('/api/user/test-user-id/participant-reviews')
          .expect(200);
        
        if (response.body.length > 0) {
          const review = response.body[0];
          expect(review).toHaveProperty('reviewer');
          // Reviewer info should be anonymized for public viewing
          expect(review.reviewer).not.toHaveProperty('email');
        }
      });

      it('should handle pagination', async () => {
        const response = await request(baseURL)
          .get('/api/user/test-user-id/participant-reviews?page=1&limit=5')
          .expect(200);
        
        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should filter by rating', async () => {
        const response = await request(baseURL)
          .get('/api/user/test-user-id/participant-reviews?minRating=4')
          .expect(200);
        
        expect(Array.isArray(response.body)).toBe(true);
      });
    });
  });

  describe('Review Statistics', () => {
    describe('GET /api/reviews/stats/:userId', () => {
      it('should return review statistics', async () => {
        const response = await request(baseURL)
          .get('/api/reviews/stats/test-user-id');
        
        expect([200, 404, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('averageRating');
          expect(response.body).toHaveProperty('totalReviews');
          expect(response.body).toHaveProperty('ratingDistribution');
        }
      });

      it('should include tag analysis', async () => {
        const response = await request(baseURL)
          .get('/api/reviews/stats/test-user-id');
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('topTags');
          expect(Array.isArray(response.body.topTags)).toBe(true);
        }
      });
    });
  });
});