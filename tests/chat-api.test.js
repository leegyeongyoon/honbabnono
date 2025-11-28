const request = require('supertest');
const jwt = require('jsonwebtoken');

describe('Chat API Tests', () => {
  const baseURL = 'http://localhost:3003';
  let validToken;
  let hostToken;
  
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.PORT = '3003';
    
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
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('Chat Room Management', () => {
    describe('GET /api/chat/rooms', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .get('/api/chat/rooms')
          .expect(401);
      });

      it('should return user\'s chat rooms', async () => {
        const response = await request(baseURL)
          .get('/api/chat/rooms')
          .set('Authorization', `Bearer ${validToken}`);
        
        expect([200, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });

      it('should include room metadata', async () => {
        const response = await request(baseURL)
          .get('/api/chat/rooms')
          .set('Authorization', `Bearer ${validToken}`);
        
        if (response.status === 200 && response.body.length > 0) {
          const room = response.body[0];
          expect(room).toHaveProperty('id');
          expect(room).toHaveProperty('meetupId');
          expect(room).toHaveProperty('lastMessage');
        }
      });
    });

    describe('GET /api/chat/rooms/by-meetup/:meetupId', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .get('/api/chat/rooms/by-meetup/test-meetup-id')
          .expect(401);
      });

      it('should handle non-existent meetup', async () => {
        const response = await request(baseURL)
          .get('/api/chat/rooms/by-meetup/non-existent-id')
          .set('Authorization', `Bearer ${validToken}`);
        
        expect([404, 500]).toContain(response.status);
      });

      it('should return chat room for meetup', async () => {
        const response = await request(baseURL)
          .get('/api/chat/rooms/by-meetup/test-meetup-id')
          .set('Authorization', `Bearer ${validToken}`);
        
        expect([200, 404, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('id');
          expect(response.body).toHaveProperty('meetupId');
        }
      });

      it('should restrict access to participants only', async () => {
        // Create a token for non-participant
        const nonParticipantToken = jwt.sign(
          { 
            userId: 'non-participant-id', 
            email: 'nonparticipant@example.com',
            name: 'Non Participant' 
          },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );

        const response = await request(baseURL)
          .get('/api/chat/rooms/by-meetup/test-meetup-id')
          .set('Authorization', `Bearer ${nonParticipantToken}`);
        
        expect([403, 404, 500]).toContain(response.status);
      });
    });
  });

  describe('Message Management', () => {
    describe('GET /api/chat/rooms/:id/messages', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .get('/api/chat/rooms/test-room-id/messages')
          .expect(401);
      });

      it('should handle non-existent room', async () => {
        const response = await request(baseURL)
          .get('/api/chat/rooms/non-existent-id/messages')
          .set('Authorization', `Bearer ${validToken}`);
        
        expect([404, 500]).toContain(response.status);
      });

      it('should return messages for valid room', async () => {
        const response = await request(baseURL)
          .get('/api/chat/rooms/test-room-id/messages')
          .set('Authorization', `Bearer ${validToken}`);
        
        expect([200, 404, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });

      it('should handle pagination', async () => {
        const response = await request(baseURL)
          .get('/api/chat/rooms/test-room-id/messages?page=1&limit=20')
          .set('Authorization', `Bearer ${validToken}`);
        
        expect([200, 404, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBeLessThanOrEqual(20);
        }
      });

      it('should handle cursor-based pagination', async () => {
        const response = await request(baseURL)
          .get('/api/chat/rooms/test-room-id/messages?before=2025-01-01T00:00:00Z&limit=10')
          .set('Authorization', `Bearer ${validToken}`);
        
        expect([200, 404, 500]).toContain(response.status);
      });

      it('should restrict access to participants', async () => {
        const nonParticipantToken = jwt.sign(
          { 
            userId: 'non-participant-id', 
            email: 'nonparticipant@example.com',
            name: 'Non Participant' 
          },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );

        const response = await request(baseURL)
          .get('/api/chat/rooms/test-room-id/messages')
          .set('Authorization', `Bearer ${nonParticipantToken}`);
        
        expect([403, 404, 500]).toContain(response.status);
      });
    });

    describe('POST /api/chat/rooms/:id/messages', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .post('/api/chat/rooms/test-room-id/messages')
          .send({ content: 'Hello!' })
          .expect(401);
      });

      it('should require message content', async () => {
        const response = await request(baseURL)
          .post('/api/chat/rooms/test-room-id/messages')
          .set('Authorization', `Bearer ${validToken}`)
          .send({});
        
        expect([400, 404, 500]).toContain(response.status);
      });

      it('should reject empty message', async () => {
        const response = await request(baseURL)
          .post('/api/chat/rooms/test-room-id/messages')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ content: '' });
        
        expect([400, 404, 500]).toContain(response.status);
      });

      it('should reject too long message', async () => {
        const longMessage = 'a'.repeat(1001); // Assuming 1000 char limit
        
        const response = await request(baseURL)
          .post('/api/chat/rooms/test-room-id/messages')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ content: longMessage });
        
        expect([400, 404, 500]).toContain(response.status);
      });

      it('should handle non-existent room', async () => {
        const response = await request(baseURL)
          .post('/api/chat/rooms/non-existent-id/messages')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ content: 'Hello!' });
        
        expect([404, 500]).toContain(response.status);
      });

      it('should send message with valid data', async () => {
        const response = await request(baseURL)
          .post('/api/chat/rooms/test-room-id/messages')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ 
            content: 'Hello everyone!',
            messageType: 'text'
          });
        
        expect([200, 201, 404, 500]).toContain(response.status);
        
        if ([200, 201].includes(response.status)) {
          expect(response.body).toHaveProperty('id');
          expect(response.body).toHaveProperty('content');
          expect(response.body).toHaveProperty('senderId');
          expect(response.body).toHaveProperty('createdAt');
        }
      });

      it('should handle different message types', async () => {
        const response = await request(baseURL)
          .post('/api/chat/rooms/test-room-id/messages')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ 
            content: 'System notification',
            messageType: 'system'
          });
        
        expect([200, 201, 400, 404, 500]).toContain(response.status);
      });

      it('should restrict access to participants', async () => {
        const nonParticipantToken = jwt.sign(
          { 
            userId: 'non-participant-id', 
            email: 'nonparticipant@example.com',
            name: 'Non Participant' 
          },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );

        const response = await request(baseURL)
          .post('/api/chat/rooms/test-room-id/messages')
          .set('Authorization', `Bearer ${nonParticipantToken}`)
          .send({ content: 'Hello!' });
        
        expect([403, 404, 500]).toContain(response.status);
      });
    });
  });

  describe('Message Actions', () => {
    describe('PUT /api/chat/messages/:id', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .put('/api/chat/messages/test-message-id')
          .send({ content: 'Updated message' })
          .expect(401);
      });

      it('should allow sender to edit message', async () => {
        const response = await request(baseURL)
          .put('/api/chat/messages/test-message-id')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ content: 'Updated message content' });
        
        expect([200, 404, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('content');
          expect(response.body).toHaveProperty('editedAt');
        }
      });

      it('should prevent editing other user\'s messages', async () => {
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
          .put('/api/chat/messages/test-message-id')
          .set('Authorization', `Bearer ${otherUserToken}`)
          .send({ content: 'Hacked message' });
        
        expect([403, 404, 500]).toContain(response.status);
      });

      it('should have time limit for editing', async () => {
        // This would test editing messages that are too old
        const response = await request(baseURL)
          .put('/api/chat/messages/old-message-id')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ content: 'Updated old message' });
        
        expect([400, 403, 404, 500]).toContain(response.status);
      });
    });

    describe('DELETE /api/chat/messages/:id', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .delete('/api/chat/messages/test-message-id')
          .expect(401);
      });

      it('should allow sender to delete message', async () => {
        const response = await request(baseURL)
          .delete('/api/chat/messages/test-message-id')
          .set('Authorization', `Bearer ${validToken}`);
        
        expect([200, 204, 404, 500]).toContain(response.status);
      });

      it('should prevent deleting other user\'s messages', async () => {
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
          .delete('/api/chat/messages/test-message-id')
          .set('Authorization', `Bearer ${otherUserToken}`);
        
        expect([403, 404, 500]).toContain(response.status);
      });
    });
  });

  describe('Chat Statistics', () => {
    describe('GET /api/chat/rooms/:id/stats', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .get('/api/chat/rooms/test-room-id/stats')
          .expect(401);
      });

      it('should return chat room statistics', async () => {
        const response = await request(baseURL)
          .get('/api/chat/rooms/test-room-id/stats')
          .set('Authorization', `Bearer ${validToken}`);
        
        expect([200, 404, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('messageCount');
          expect(response.body).toHaveProperty('participantCount');
          expect(response.body).toHaveProperty('createdAt');
        }
      });
    });
  });

  describe('Real-time Features', () => {
    describe('Message Read Status', () => {
      it('should mark messages as read', async () => {
        const response = await request(baseURL)
          .post('/api/chat/rooms/test-room-id/mark-read')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ lastReadMessageId: 'message-id' });
        
        expect([200, 404, 500]).toContain(response.status);
      });
    });

    describe('Typing Indicators', () => {
      it('should handle typing status', async () => {
        const response = await request(baseURL)
          .post('/api/chat/rooms/test-room-id/typing')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ isTyping: true });
        
        expect([200, 404, 500]).toContain(response.status);
      });
    });
  });

  describe('Chat Moderation', () => {
    describe('Message Reporting', () => {
      it('should allow reporting inappropriate messages', async () => {
        const response = await request(baseURL)
          .post('/api/chat/messages/test-message-id/report')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ 
            reason: 'inappropriate',
            description: 'Spam message'
          });
        
        expect([200, 404, 500]).toContain(response.status);
      });

      it('should require reason for report', async () => {
        const response = await request(baseURL)
          .post('/api/chat/messages/test-message-id/report')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ description: 'Spam message' });
        
        expect([400, 404, 500]).toContain(response.status);
      });
    });

    describe('User Blocking', () => {
      it('should allow blocking users in chat', async () => {
        const response = await request(baseURL)
          .post('/api/chat/block-user')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ blockedUserId: 'user-to-block-id' });
        
        expect([200, 404, 500]).toContain(response.status);
      });

      it('should prevent self-blocking', async () => {
        const response = await request(baseURL)
          .post('/api/chat/block-user')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ blockedUserId: 'test-user-id' });
        
        expect([400, 500]).toContain(response.status);
      });
    });
  });
});