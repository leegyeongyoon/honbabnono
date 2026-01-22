/**
 * Jest Global Setup
 * 테스트 시작 전 전역 설정
 */
const path = require('path');

module.exports = async () => {
  // 테스트 환경변수 로드
  require('dotenv').config({ path: path.join(__dirname, '../../.env.test') });

  // 전역 설정
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key';

  console.log('\n🧪 Jest Global Setup 완료');
  console.log(`   환경: ${process.env.NODE_ENV}`);
  console.log(`   DB: ${process.env.DATABASE_URL ? '설정됨' : '미설정'}`);
};
