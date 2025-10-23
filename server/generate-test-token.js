const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

// 환경변수 로드
dotenv.config();

// JWT 시크릿 키 (환경변수가 없으면 기본값 사용)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// 테스트용 사용자 데이터
const testUsers = [
  {
    userId: '11111111-1111-1111-1111-111111111111',
    email: 'test1@test.com',
    name: '테스트유저1'
  },
  {
    userId: '22222222-2222-2222-2222-222222222222',
    email: 'test2@test.com',
    name: '테스트유저2'
  },
  {
    userId: '33333333-3333-3333-3333-333333333333',
    email: 'test3@test.com',
    name: '테스트유저3'
  }
];

function generateTestTokens() {
  console.log('🔑 테스트용 JWT 토큰 생성\n');
  
  testUsers.forEach((user, index) => {
    const token = jwt.sign(
      {
        userId: user.userId,
        email: user.email,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log(`사용자 ${index + 1}: ${user.name} (${user.email})`);
    console.log(`토큰: ${token}\n`);
  });
  
  console.log('💡 사용법:');
  console.log('위 토큰을 test-rice-index.js 파일의 TEST_USER_TOKEN 변수에 복사하여 사용하세요.\n');
}

// 토큰 검증 함수
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ 토큰 검증 성공:');
    console.log(JSON.stringify(decoded, null, 2));
  } catch (error) {
    console.log('❌ 토큰 검증 실패:', error.message);
  }
}

// 명령행 인자 처리
const args = process.argv.slice(2);

if (args.length === 0) {
  generateTestTokens();
} else if (args[0] === 'verify') {
  if (args[1]) {
    console.log('🔍 토큰 검증 중...\n');
    verifyToken(args[1]);
  } else {
    console.log('❌ 검증할 토큰을 제공해주세요.');
    console.log('사용법: node generate-test-token.js verify <token>');
  }
} else {
  console.log('사용법:');
  console.log('- 토큰 생성: node generate-test-token.js');
  console.log('- 토큰 검증: node generate-test-token.js verify <token>');
}

module.exports = { generateTestTokens, verifyToken };