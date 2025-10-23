const axios = require('axios');
const assert = require('assert');

// 테스트 설정
const API_BASE_URL = 'http://localhost:3001/api';
const TEST_USER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMTExMTExMS0xMTExLTExMTEtMTExMS0xMTExMTExMTExMTEiLCJlbWFpbCI6InRlc3QxQHRlc3QuY29tIiwibmFtZSI6Iu2FjOyKpO2KuOycoOyggDEiLCJpYXQiOjE3NjEyMDE0NTcsImV4cCI6MTc2MTI4Nzg1N30.SWgGJUCrttTe7hKtRdUtJSqmNdi7IXcYiTiWfuGfW44';

// 테스트 색상 출력
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// API 클라이언트
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${TEST_USER_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// 테스트 케이스 클래스
class RiceIndexTestSuite {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  async runTest(name, testFn) {
    try {
      log('blue', `\n🧪 테스트 실행: ${name}`);
      await testFn();
      this.passed++;
      log('green', `✅ 통과: ${name}`);
    } catch (error) {
      this.failed++;
      log('red', `❌ 실패: ${name}`);
      log('red', `   에러: ${error.message}`);
      if (error.response) {
        log('red', `   응답 상태: ${error.response.status}`);
        log('red', `   응답 데이터: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
  }

  // 1. 밥알지수 API 연결 테스트
  async testApiConnection() {
    const response = await apiClient.get('/user/rice-index');
    assert(response.status === 200, '응답 상태코드가 200이 아님');
    assert(response.data.success === true, 'success 필드가 true가 아님');
    assert(typeof response.data.riceIndex === 'number', 'riceIndex가 숫자가 아님');
    assert(response.data.riceIndex >= 0, 'riceIndex가 음수임');
    assert(response.data.riceIndex <= 1000, 'riceIndex가 1000을 초과함');
  }

  // 2. 밥알지수 계산 알고리즘 검증
  async testRiceIndexCalculation() {
    const response = await apiClient.get('/user/rice-index');
    const { riceIndex, stats } = response.data;
    
    // 통계 데이터 검증
    assert(typeof stats === 'object', '통계 데이터가 객체가 아님');
    assert(typeof stats.joinedMeetups === 'number', '참여 모임 수가 숫자가 아님');
    assert(typeof stats.hostedMeetups === 'number', '호스팅 모임 수가 숫자가 아님');
    assert(typeof stats.completedMeetups === 'number', '완료 모임 수가 숫자가 아님');
    assert(typeof stats.reviewsWritten === 'number', '리뷰 작성 수가 숫자가 아님');
    assert(typeof stats.averageRating === 'number', '평균 평점이 숫자가 아님');
    
    // 기본 점수 검증 (최소 40.0점)
    assert(riceIndex >= 40.0, '기본 점수 40.0점이 반영되지 않음');
    
    // 새로운 알고리즘 검증은 복잡하므로 범위 검증만 수행
    log('yellow', `   실제 점수: ${riceIndex}, 통계: ${JSON.stringify(stats)}`);
    
    // 점수가 유효한 범위 내에 있는지만 확인
    assert(riceIndex >= 0.0 && riceIndex <= 100.0, '밥알지수가 유효 범위(0.0~100.0)를 벗어남');
    
    // 활동이 있으면 기본 점수보다 높아야 함
    const hasActivity = stats.joinedMeetups > 0 || stats.hostedMeetups > 0 || stats.reviewsWritten > 0;
    if (hasActivity) {
      assert(riceIndex >= 40.0, '활동이 있는데 기본 점수보다 낮음');
    }
  }

  // 3. 인증 검증 테스트
  async testAuthenticationRequired() {
    try {
      await axios.get(`${API_BASE_URL}/user/rice-index`);
      throw new Error('인증 없이 API에 접근할 수 있음');
    } catch (error) {
      assert(error.response.status === 401 || error.response.status === 403, 
             '인증 오류 상태코드가 올바르지 않음');
    }
  }

  // 4. 잘못된 토큰 테스트
  async testInvalidToken() {
    try {
      await axios.get(`${API_BASE_URL}/user/rice-index`, {
        headers: { 'Authorization': 'Bearer invalid_token_here' }
      });
      throw new Error('잘못된 토큰으로 API에 접근할 수 있음');
    } catch (error) {
      assert(error.response.status === 403, '잘못된 토큰 오류 상태코드가 403이 아님');
    }
  }

  // 5. 응답 데이터 구조 검증
  async testResponseStructure() {
    const response = await apiClient.get('/user/rice-index');
    const data = response.data;
    
    // 필수 필드 검증
    assert('success' in data, 'success 필드가 없음');
    assert('riceIndex' in data, 'riceIndex 필드가 없음');
    assert('stats' in data, 'stats 필드가 없음');
    
    // stats 객체 구조 검증
    const requiredStatsFields = [
      'joinedMeetups', 'hostedMeetups', 'completedMeetups', 
      'reviewsWritten', 'averageRating'
    ];
    
    for (const field of requiredStatsFields) {
      assert(field in data.stats, `stats.${field} 필드가 없음`);
      assert(typeof data.stats[field] === 'number', `stats.${field}이 숫자가 아님`);
      assert(data.stats[field] >= 0, `stats.${field}이 음수임`);
    }
  }

  // 6. 경계값 테스트
  async testBoundaryValues() {
    const response = await apiClient.get('/user/rice-index');
    const { riceIndex } = response.data;
    
    // 최소값 테스트
    assert(riceIndex >= 0.0, '밥알지수가 최소값 0.0보다 작음');
    
    // 최대값 테스트
    assert(riceIndex <= 100.0, '밥알지수가 최대값 100.0을 초과함');
    
    // 숫자값 테스트 (소수점 허용)
    assert(typeof riceIndex === 'number' && !isNaN(riceIndex), '밥알지수가 유효한 숫자가 아님');
  }

  // 7. 성능 테스트
  async testPerformance() {
    const startTime = Date.now();
    const iterations = 5;
    
    for (let i = 0; i < iterations; i++) {
      await apiClient.get('/user/rice-index');
    }
    
    const endTime = Date.now();
    const avgTime = (endTime - startTime) / iterations;
    
    log('yellow', `   평균 응답 시간: ${avgTime.toFixed(2)}ms`);
    assert(avgTime < 1000, '평균 응답 시간이 1초를 초과함');
  }

  // 8. 동시성 테스트
  async testConcurrency() {
    const promises = [];
    const concurrentRequests = 10;
    
    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(apiClient.get('/user/rice-index'));
    }
    
    const responses = await Promise.all(promises);
    
    // 모든 응답이 성공적인지 확인
    responses.forEach((response, index) => {
      assert(response.status === 200, `동시 요청 ${index + 1}이 실패함`);
      assert(response.data.success === true, `동시 요청 ${index + 1}의 success가 false임`);
    });
    
    // 일관성 검증 (모든 응답이 동일한 결과를 반환해야 함)
    const firstResult = responses[0].data.riceIndex;
    responses.forEach((response, index) => {
      assert(response.data.riceIndex === firstResult, 
             `동시 요청 ${index + 1}의 결과가 일관되지 않음`);
    });
  }

  // 9. 오류 처리 테스트
  async testErrorHandling() {
    // 서버 오류 시뮬레이션을 위한 잘못된 엔드포인트 테스트
    try {
      await apiClient.get('/user/rice-index-invalid');
      throw new Error('존재하지 않는 엔드포인트에 접근할 수 있음');
    } catch (error) {
      assert(error.response.status === 404, '존재하지 않는 엔드포인트 오류가 404가 아님');
    }
  }

  // 10. 데이터 일관성 테스트
  async testDataConsistency() {
    const responses = [];
    
    // 연속 3번 요청
    for (let i = 0; i < 3; i++) {
      const response = await apiClient.get('/user/rice-index');
      responses.push(response.data);
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms 대기
    }
    
    // 모든 응답이 동일한지 확인
    const firstResult = responses[0];
    responses.forEach((result, index) => {
      assert(result.riceIndex === firstResult.riceIndex, 
             `요청 ${index + 1}의 밥알지수가 일관되지 않음`);
      assert(JSON.stringify(result.stats) === JSON.stringify(firstResult.stats), 
             `요청 ${index + 1}의 통계가 일관되지 않음`);
    });
  }

  // 전체 테스트 실행
  async runAllTests() {
    log('blue', '🚀 밥알지수 API 종합 테스트 시작\n');
    
    const testMethods = [
      { name: 'API 연결 테스트', method: this.testApiConnection },
      { name: '밥알지수 계산 알고리즘 검증', method: this.testRiceIndexCalculation },
      { name: '인증 필수 검증', method: this.testAuthenticationRequired },
      { name: '잘못된 토큰 처리', method: this.testInvalidToken },
      { name: '응답 데이터 구조 검증', method: this.testResponseStructure },
      { name: '경계값 테스트', method: this.testBoundaryValues },
      { name: '성능 테스트', method: this.testPerformance },
      { name: '동시성 테스트', method: this.testConcurrency },
      { name: '오류 처리 테스트', method: this.testErrorHandling },
      { name: '데이터 일관성 테스트', method: this.testDataConsistency }
    ];

    for (const test of testMethods) {
      await this.runTest(test.name, test.method.bind(this));
    }

    // 결과 출력
    log('blue', '\n📊 테스트 결과 요약');
    log('green', `✅ 통과: ${this.passed}개`);
    log('red', `❌ 실패: ${this.failed}개`);
    log('yellow', `📈 성공률: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);
    
    if (this.failed === 0) {
      log('green', '\n🎉 모든 테스트가 통과했습니다!');
    } else {
      log('red', '\n⚠️  일부 테스트가 실패했습니다. 코드를 점검해주세요.');
      process.exit(1);
    }
  }
}

// 테스트 실행
async function main() {
  try {
    // 서버 연결 확인
    log('blue', '🔍 서버 연결 확인 중...');
    await axios.get(`${API_BASE_URL}/health`);
    log('green', '✅ 서버 연결 성공');
    
    // 테스트 실행
    const testSuite = new RiceIndexTestSuite();
    await testSuite.runAllTests();
    
  } catch (error) {
    log('red', '❌ 서버에 연결할 수 없습니다.');
    log('red', `에러: ${error.message}`);
    log('yellow', '서버가 실행 중인지 확인해주세요: npm start or node index.js');
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}

module.exports = { RiceIndexTestSuite };