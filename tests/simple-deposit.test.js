const axios = require('axios');

describe('간단한 약속금 결제 테스트', () => {
  const baseURL = 'http://localhost:3001';
  
  // 실제 사용자 토큰 (테스트용)
  const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg5NmI0MGViLTQxYWItNDY2ZC04NmE4LTczY2EyYWFiMmExNyIsImVtYWlsIjoicmVzdGFwaUBrYWthby5jb20iLCJuYW1lIjoi6rK97JykIiwiaWF0IjoxNzYzNDQwNjM1LCJleHAiOjE3NjQwNDU0MzV9._-3kq0oeuAz5BlSYm7sjwzj-DgO3xjuO5bte3CvBtxo';

  test('서버 헬스 체크', async () => {
    const response = await axios.get(`${baseURL}/api/health`);
    expect(response.status).toBe(200);
  });

  test('포인트 결제로 약속금 결제 성공', async () => {
    try {
      const response = await axios.post(`${baseURL}/api/deposits/payment`, {
        amount: 3000,
        meetupId: `temp-test-${Date.now()}`,
        paymentMethod: 'points'
      }, {
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ 결제 응답:', response.data);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.paymentId).toBeDefined();
      expect(response.data.meetupId).toBeDefined();
      
      // meetupId가 실제 UUID인지 확인 (temp- 로 시작하지 않음)
      expect(response.data.meetupId).not.toMatch(/^temp-/);
    } catch (error) {
      console.error('❌ 테스트 실패:', error.response?.data || error.message);
      throw error;
    }
  });

  test('카카오페이 결제 요청 성공', async () => {
    try {
      const response = await axios.post(`${baseURL}/api/deposits/payment`, {
        amount: 3000,
        meetupId: `temp-kakao-${Date.now()}`,
        paymentMethod: 'kakaopay'
      }, {
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json'
        }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.redirectUrl).toContain('mockup-kakaopay.com');
    } catch (error) {
      console.error('❌ 카카오페이 테스트 실패:', error.response?.data || error.message);
      throw error;
    }
  });

  test('필수 정보 누락 시 오류 반환', async () => {
    try {
      await axios.post(`${baseURL}/api/deposits/payment`, {
        amount: 3000,
        // meetupId 누락
        paymentMethod: 'points'
      }, {
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // 여기까지 오면 안됨 (오류가 발생해야 함)
      fail('오류가 발생해야 하는데 성공했습니다');
    } catch (error) {
      expect(error.response.status).toBe(400);
      expect(error.response.data.success).toBe(false);
      expect(error.response.data.error).toBe('필수 정보가 누락되었습니다.');
    }
  });
});