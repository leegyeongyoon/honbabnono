const axios = require('axios');
const { Pool } = require('pg');

// 테스트용 환경 설정
const testConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'test_honbabnono',
  port: process.env.DB_PORT || 5432,
};

const pool = new Pool(testConfig);

// 테스트용 서버 설정
process.env.NODE_ENV = 'test';
process.env.PORT = '3002'; // 테스트용 포트

// 서버를 테스트용으로 import (실제로는 Express 앱만 필요)
// 현재 서버 파일이 바로 app을 export하지 않으므로 API 테스트는 실제 서버에 대해 진행
const baseURL = 'http://localhost:3001';

describe('약속금 결제 시스템', () => {
  let testUserId;
  let authToken;

  beforeAll(async () => {
    // 테스트 데이터베이스 설정
    try {
      // 테스트 사용자 생성
      const userResult = await pool.query(`
        INSERT INTO users (id, email, name, password, provider, provider_id, is_verified, created_at, updated_at) 
        VALUES (gen_random_uuid(), 'test@test.com', '테스트사용자', 'password123', 'email', 'test123', true, NOW(), NOW())
        RETURNING id
      `);
      testUserId = userResult.rows[0].id;

      // 테스트 사용자 포인트 설정
      await pool.query(`
        INSERT INTO user_points (user_id, total_points, available_points, used_points, expired_points)
        VALUES ($1, 10000, 10000, 0, 0)
      `, [testUserId]);

      // JWT 토큰 생성 (실제 구현에 맞게 조정 필요)
      const jwt = require('jsonwebtoken');
      authToken = jwt.sign(
        { id: testUserId, email: 'test@test.com', name: '테스트사용자' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );
    } catch (error) {
      console.error('테스트 설정 실패:', error);
    }
  });

  afterAll(async () => {
    // 테스트 데이터 정리
    try {
      await pool.query('DELETE FROM promise_deposits WHERE user_id = $1', [testUserId]);
      await pool.query('DELETE FROM point_transactions WHERE user_id = $1', [testUserId]);
      await pool.query('DELETE FROM user_points WHERE user_id = $1', [testUserId]);
      await pool.query('DELETE FROM meetups WHERE host_id = $1', [testUserId]);
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    } catch (error) {
      console.error('테스트 정리 실패:', error);
    }
    await pool.end();
  });

  beforeEach(async () => {
    // 각 테스트 전에 포인트 리셋
    await pool.query(`
      UPDATE user_points 
      SET available_points = 10000, used_points = 0, total_points = 10000
      WHERE user_id = $1
    `, [testUserId]);
  });

  describe('포인트 결제', () => {
    test('충분한 포인트로 약속금 결제 성공', async () => {
      try {
        const response = await axios.post(`${baseURL}/api/deposits/payment`, {
          amount: 3000,
          meetupId: 'temp-test-12345',
          paymentMethod: 'points'
        }, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });

        expect(response.status).toBe(200);
        expect(response.data.success).toBe(true);
        expect(response.data.paymentId).toBeDefined();
        expect(response.data.meetupId).toBeDefined();
        expect(response.data.meetupId).not.toBe('temp-test-12345'); // 실제 UUID가 반환되어야 함
      } catch (error) {
        console.error('테스트 실패:', error.response?.data || error.message);
        throw error;
      }
    });

    test('포인트 부족 시 결제 실패', async () => {
      // 포인트를 1000으로 설정
      await pool.query(`
        UPDATE user_points 
        SET available_points = 1000, total_points = 1000
        WHERE user_id = $1
      `, [testUserId]);

      const response = await request(app)
        .post('/api/deposits/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 3000,
          meetupId: 'temp-test-12345',
          paymentMethod: 'points'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('보유 포인트가 부족합니다.');
    });

    test('결제 후 포인트 차감 확인', async () => {
      await request(app)
        .post('/api/deposits/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 3000,
          meetupId: 'temp-test-points-deduct',
          paymentMethod: 'points'
        });

      // 포인트 잔액 확인
      const pointsResult = await pool.query(`
        SELECT available_points, used_points FROM user_points WHERE user_id = $1
      `, [testUserId]);

      expect(pointsResult.rows[0].available_points).toBe(7000); // 10000 - 3000
      expect(pointsResult.rows[0].used_points).toBe(3000);
    });

    test('포인트 거래 내역 기록 확인', async () => {
      await request(app)
        .post('/api/deposits/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 3000,
          meetupId: 'temp-test-transaction',
          paymentMethod: 'points'
        });

      // 거래 내역 확인
      const transactionResult = await pool.query(`
        SELECT * FROM point_transactions 
        WHERE user_id = $1 AND type = 'used' AND amount = 3000
        ORDER BY created_at DESC LIMIT 1
      `, [testUserId]);

      expect(transactionResult.rows.length).toBe(1);
      expect(transactionResult.rows[0].description).toContain('모임 약속금 결제');
    });
  });

  describe('카카오페이 결제', () => {
    test('카카오페이 결제 요청 성공', async () => {
      const response = await request(app)
        .post('/api/deposits/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 3000,
          meetupId: 'temp-test-kakao',
          paymentMethod: 'kakaopay'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.paymentId).toBeDefined();
      expect(response.body.redirectUrl).toBeDefined();
      expect(response.body.redirectUrl).toContain('mockup-kakaopay.com');
    });
  });

  describe('카드 결제', () => {
    test('카드 결제 요청 성공', async () => {
      const response = await request(app)
        .post('/api/deposits/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 3000,
          meetupId: 'temp-test-card',
          paymentMethod: 'card'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.paymentId).toBeDefined();
    });
  });

  describe('임시 meetup 생성', () => {
    test('임시 ID로 결제 시 실제 meetup 생성 확인', async () => {
      const response = await request(app)
        .post('/api/deposits/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 3000,
          meetupId: 'temp-test-meetup-creation',
          paymentMethod: 'points'
        });

      const meetupId = response.body.meetupId;

      // 생성된 meetup 확인
      const meetupResult = await pool.query(`
        SELECT * FROM meetups WHERE id = $1
      `, [meetupId]);

      expect(meetupResult.rows.length).toBe(1);
      expect(meetupResult.rows[0].title).toBe('임시 모임 (결제 진행 중)');
      expect(meetupResult.rows[0].host_id).toBe(testUserId);
      expect(meetupResult.rows[0].status).toBe('pending');
    });

    test('약속금 기록에 실제 meetup ID 저장 확인', async () => {
      const response = await request(app)
        .post('/api/deposits/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 3000,
          meetupId: 'temp-test-deposit-record',
          paymentMethod: 'points'
        });

      const meetupId = response.body.meetupId;
      const depositId = response.body.paymentId;

      // 약속금 기록 확인
      const depositResult = await pool.query(`
        SELECT * FROM promise_deposits WHERE id = $1
      `, [depositId]);

      expect(depositResult.rows.length).toBe(1);
      expect(depositResult.rows[0].meetup_id).toBe(meetupId);
      expect(depositResult.rows[0].user_id).toBe(testUserId);
      expect(depositResult.rows[0].amount).toBe(3000);
      expect(depositResult.rows[0].status).toBe('paid');
    });
  });

  describe('입력값 검증', () => {
    test('필수 정보 누락 시 오류 반환', async () => {
      const response = await request(app)
        .post('/api/deposits/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 3000,
          // meetupId 누락
          paymentMethod: 'points'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('필수 정보가 누락되었습니다.');
    });

    test('지원하지 않는 결제 방식 시 오류 반환', async () => {
      const response = await request(app)
        .post('/api/deposits/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 3000,
          meetupId: 'temp-test-invalid-method',
          paymentMethod: 'invalid-method'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('지원하지 않는 결제 방식입니다.');
    });

    test('인증 토큰 없이 요청 시 오류 반환', async () => {
      const response = await request(app)
        .post('/api/deposits/payment')
        .send({
          amount: 3000,
          meetupId: 'temp-test-no-auth',
          paymentMethod: 'points'
        });

      expect(response.status).toBe(401); // 인증 오류
    });
  });

  describe('중복 결제 방지', () => {
    test('실제 meetup ID로 중복 결제 시 오류 반환', async () => {
      // 먼저 실제 meetup 생성
      const meetupResult = await pool.query(`
        INSERT INTO meetups (
          title, description, location, date, time, 
          max_participants, category, host_id, status,
          created_at, updated_at
        ) VALUES (
          '테스트 모임', '테스트용 모임', '테스트 장소', 
          CURRENT_DATE + INTERVAL '1 day', '12:00:00',
          4, 'food', $1, 'active',
          NOW(), NOW()
        ) RETURNING id
      `, [testUserId]);

      const realMeetupId = meetupResult.rows[0].id;

      // 첫 번째 결제
      const firstPayment = await request(app)
        .post('/api/deposits/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 3000,
          meetupId: realMeetupId,
          paymentMethod: 'points'
        });

      expect(firstPayment.status).toBe(200);

      // 포인트 복원
      await pool.query(`
        UPDATE user_points 
        SET available_points = 10000, used_points = 0, total_points = 10000
        WHERE user_id = $1
      `, [testUserId]);

      // 두 번째 결제 시도 (중복)
      const secondPayment = await request(app)
        .post('/api/deposits/payment')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 3000,
          meetupId: realMeetupId,
          paymentMethod: 'points'
        });

      expect(secondPayment.status).toBe(400);
      expect(secondPayment.body.success).toBe(false);
      expect(secondPayment.body.error).toBe('이미 해당 모임의 약속금을 결제하셨습니다.');
    });
  });
});