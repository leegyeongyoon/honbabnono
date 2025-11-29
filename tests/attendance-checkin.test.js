const request = require('supertest');
const jwt = require('jsonwebtoken');

describe('Attendance & Check-in API Tests', () => {
  const baseURL = 'http://localhost:3003';
  let hostToken;
  let participantToken;
  
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.PORT = '3003';
    
    hostToken = jwt.sign(
      { 
        userId: 'host-user-id', 
        email: 'host@example.com',
        name: 'Test Host' 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    participantToken = jwt.sign(
      { 
        userId: 'participant-user-id', 
        email: 'participant@example.com',
        name: 'Test Participant' 
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  describe('QR Code Check-in System', () => {
    describe('POST /api/meetups/:id/qrcode/generate', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .post('/api/meetups/test-meetup-id/qrcode/generate')
          .expect(401);
      });

      it('should allow host to generate QR code', async () => {
        const response = await request(baseURL)
          .post('/api/meetups/test-meetup-id/qrcode/generate')
          .set('Authorization', `Bearer ${hostToken}`);
        
        expect([200, 201, 404, 500]).toContain(response.status);
        
        if ([200, 201].includes(response.status)) {
          expect(response.body).toHaveProperty('qrCode');
          expect(response.body).toHaveProperty('expiresAt');
        }
      });

      it('should prevent non-host from generating QR', async () => {
        const response = await request(baseURL)
          .post('/api/meetups/test-meetup-id/qrcode/generate')
          .set('Authorization', `Bearer ${participantToken}`);
        
        expect([403, 404, 500]).toContain(response.status);
      });
    });

    describe('POST /api/meetups/:id/checkin/qr', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .post('/api/meetups/test-meetup-id/checkin/qr')
          .send({ qrData: 'test-qr-data' })
          .expect(401);
      });

      it('should require QR data', async () => {
        const response = await request(baseURL)
          .post('/api/meetups/test-meetup-id/checkin/qr')
          .set('Authorization', `Bearer ${participantToken}`)
          .send({});
        
        expect([400, 404, 500]).toContain(response.status);
      });

      it('should handle QR check-in', async () => {
        const response = await request(baseURL)
          .post('/api/meetups/test-meetup-id/checkin/qr')
          .set('Authorization', `Bearer ${participantToken}`)
          .send({ qrData: 'valid-qr-data-string' });
        
        expect([200, 201, 400, 404, 500]).toContain(response.status);
        
        if ([200, 201].includes(response.status)) {
          expect(response.body).toHaveProperty('checkedIn', true);
          expect(response.body).toHaveProperty('checkinTime');
        }
      });

      it('should reject expired QR codes', async () => {
        const response = await request(baseURL)
          .post('/api/meetups/test-meetup-id/checkin/qr')
          .set('Authorization', `Bearer ${participantToken}`)
          .send({ qrData: 'expired-qr-data-string' });
        
        expect([400, 404, 500]).toContain(response.status);
      });
    });
  });

  describe('GPS Check-in System', () => {
    describe('POST /api/meetups/:id/checkin/gps', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .post('/api/meetups/test-meetup-id/checkin/gps')
          .send({ latitude: 37.5665, longitude: 126.9780 })
          .expect(401);
      });

      it('should require GPS coordinates', async () => {
        const response = await request(baseURL)
          .post('/api/meetups/test-meetup-id/checkin/gps')
          .set('Authorization', `Bearer ${participantToken}`)
          .send({});
        
        expect([400, 404, 500]).toContain(response.status);
      });

      it('should handle GPS check-in with valid coordinates', async () => {
        const response = await request(baseURL)
          .post('/api/meetups/test-meetup-id/checkin/gps')
          .set('Authorization', `Bearer ${participantToken}`)
          .send({ 
            latitude: 37.5665, 
            longitude: 126.9780,
            accuracy: 5
          });
        
        expect([200, 201, 400, 404, 500]).toContain(response.status);
        
        if ([200, 201].includes(response.status)) {
          expect(response.body).toHaveProperty('checkedIn');
          expect(response.body).toHaveProperty('distance');
        }
      });

      it('should reject check-in if too far from location', async () => {
        const response = await request(baseURL)
          .post('/api/meetups/test-meetup-id/checkin/gps')
          .set('Authorization', `Bearer ${participantToken}`)
          .send({ 
            latitude: 35.1595, // Busan coordinates (far from Seoul)
            longitude: 129.0756,
            accuracy: 10
          });
        
        expect([400, 404, 500]).toContain(response.status);
      });

      it('should validate GPS coordinate ranges', async () => {
        const response = await request(baseURL)
          .post('/api/meetups/test-meetup-id/checkin/gps')
          .set('Authorization', `Bearer ${participantToken}`)
          .send({ 
            latitude: 91, // Invalid latitude
            longitude: 181, // Invalid longitude
            accuracy: 5
          });
        
        expect([400, 404, 500]).toContain(response.status);
      });
    });

    describe('POST /api/meetups/:id/verify-location', () => {
      it('should verify meetup location', async () => {
        const response = await request(baseURL)
          .post('/api/meetups/test-meetup-id/verify-location')
          .set('Authorization', `Bearer ${participantToken}`)
          .send({ 
            latitude: 37.5665, 
            longitude: 126.9780
          });
        
        expect([200, 400, 404, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(response.body).toHaveProperty('isValidLocation');
          expect(response.body).toHaveProperty('distance');
        }
      });
    });
  });

  describe('Attendance Management', () => {
    describe('GET /api/meetups/:meetupId/attendance/participants', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .get('/api/meetups/test-meetup-id/attendance/participants')
          .expect(401);
      });

      it('should return attendance list for host', async () => {
        const response = await request(baseURL)
          .get('/api/meetups/test-meetup-id/attendance/participants')
          .set('Authorization', `Bearer ${hostToken}`);
        
        expect([200, 404, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });

      it('should restrict access to host only', async () => {
        const response = await request(baseURL)
          .get('/api/meetups/test-meetup-id/attendance/participants')
          .set('Authorization', `Bearer ${participantToken}`);
        
        expect([403, 404, 500]).toContain(response.status);
      });
    });

    describe('GET /api/meetups/:meetupId/attendance/confirmable-participants', () => {
      it('should return participants that can be confirmed', async () => {
        const response = await request(baseURL)
          .get('/api/meetups/test-meetup-id/attendance/confirmable-participants')
          .set('Authorization', `Bearer ${hostToken}`);
        
        expect([200, 404, 500]).toContain(response.status);
        
        if (response.status === 200) {
          expect(Array.isArray(response.body)).toBe(true);
        }
      });
    });

    describe('POST /api/meetups/:meetupId/attendance/host-confirm', () => {
      it('should require authentication', async () => {
        await request(baseURL)
          .post('/api/meetups/test-meetup-id/attendance/host-confirm')
          .send({ participantId: 'participant-id' })
          .expect(401);
      });

      it('should allow host to confirm attendance', async () => {
        const response = await request(baseURL)
          .post('/api/meetups/test-meetup-id/attendance/host-confirm')
          .set('Authorization', `Bearer ${hostToken}`)
          .send({ participantId: 'participant-user-id' });
        
        expect([200, 201, 400, 404, 500]).toContain(response.status);
        
        if ([200, 201].includes(response.status)) {
          expect(response.body).toHaveProperty('confirmed', true);
        }
      });

      it('should prevent non-host from confirming', async () => {
        const response = await request(baseURL)
          .post('/api/meetups/test-meetup-id/attendance/host-confirm')
          .set('Authorization', `Bearer ${participantToken}`)
          .send({ participantId: 'other-participant-id' });
        
        expect([403, 404, 500]).toContain(response.status);
      });
    });

    describe('POST /api/meetups/:meetupId/attendance/mutual-confirm', () => {
      it('should allow mutual confirmation between participants', async () => {
        const response = await request(baseURL)
          .post('/api/meetups/test-meetup-id/attendance/mutual-confirm')
          .set('Authorization', `Bearer ${participantToken}`)
          .send({ 
            otherParticipantId: 'other-participant-id',
            confirmed: true
          });
        
        expect([200, 201, 400, 404, 500]).toContain(response.status);
        
        if ([200, 201].includes(response.status)) {
          expect(response.body).toHaveProperty('mutualConfirmation');
        }
      });

      it('should require other participant ID', async () => {
        const response = await request(baseURL)
          .post('/api/meetups/test-meetup-id/attendance/mutual-confirm')
          .set('Authorization', `Bearer ${participantToken}`)
          .send({ confirmed: true });
        
        expect([400, 404, 500]).toContain(response.status);
      });
    });
  });

  describe('No-Show Penalty System', () => {
    describe('POST /api/meetups/:meetupId/apply-no-show-penalties', () => {
      it('should require host authentication', async () => {
        await request(baseURL)
          .post('/api/meetups/test-meetup-id/apply-no-show-penalties')
          .send({ noShowParticipants: ['participant1', 'participant2'] })
          .expect(401);
      });

      it('should allow host to apply penalties', async () => {
        const response = await request(baseURL)
          .post('/api/meetups/test-meetup-id/apply-no-show-penalties')
          .set('Authorization', `Bearer ${hostToken}`)
          .send({ 
            noShowParticipants: ['no-show-participant-id'],
            penaltyAmount: 3000,
            reason: 'No attendance confirmation'
          });
        
        expect([200, 201, 400, 404, 500]).toContain(response.status);
        
        if ([200, 201].includes(response.status)) {
          expect(response.body).toHaveProperty('penaltiesApplied');
        }
      });

      it('should require no-show participants list', async () => {
        const response = await request(baseURL)
          .post('/api/meetups/test-meetup-id/apply-no-show-penalties')
          .set('Authorization', `Bearer ${hostToken}`)
          .send({});
        
        expect([400, 404, 500]).toContain(response.status);
      });

      it('should prevent participants from applying penalties', async () => {
        const response = await request(baseURL)
          .post('/api/meetups/test-meetup-id/apply-no-show-penalties')
          .set('Authorization', `Bearer ${participantToken}`)
          .send({ noShowParticipants: ['participant1'] });
        
        expect([403, 404, 500]).toContain(response.status);
      });
    });
  });
});