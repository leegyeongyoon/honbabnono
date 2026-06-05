/**
 * CORS 출처 허용 로직 단위 테스트
 * - 프로덕션: 고정 화이트리스트만
 * - 개발/테스트: 모든 localhost 포트 허용 (web/merchant/admin 포트 충돌 대응)
 *
 * server/index.js의 corsOrigin과 동일한 로직을 복제 검증한다
 * (index.js 전체를 require하면 서버가 기동되므로 로직만 분리 테스트).
 */

const PROD_ORIGINS = ['https://eattable.kr', 'https://admin.eattable.kr'];
const isLocalhostOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');

function makeCorsOrigin(nodeEnv) {
  return (origin, callback) => {
    if (!origin || PROD_ORIGINS.includes(origin)) return callback(null, true);
    if (nodeEnv !== 'production' && isLocalhostOrigin(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  };
}

const allows = (fn, origin) => new Promise((resolve) => {
  fn(origin, (err, ok) => resolve(!err && ok === true));
});

describe('CORS origin 허용 로직', () => {
  describe('개발/테스트 환경', () => {
    const cors = makeCorsOrigin('test');

    it('모든 localhost 포트를 허용한다 (web 3000 / merchant 3002 / admin 3004)', async () => {
      expect(await allows(cors, 'http://localhost:3000')).toBe(true);
      expect(await allows(cors, 'http://localhost:3002')).toBe(true);
      expect(await allows(cors, 'http://localhost:3004')).toBe(true);
      expect(await allows(cors, 'http://127.0.0.1:5173')).toBe(true);
    });

    it('origin 없음(서버간/curl)을 허용한다', async () => {
      expect(await allows(cors, undefined)).toBe(true);
    });

    it('프로덕션 도메인도 허용한다', async () => {
      expect(await allows(cors, 'https://eattable.kr')).toBe(true);
    });

    it('외부 출처는 차단한다', async () => {
      expect(await allows(cors, 'https://evil.example.com')).toBe(false);
    });
  });

  describe('프로덕션 환경', () => {
    const cors = makeCorsOrigin('production');

    it('화이트리스트 도메인만 허용한다', async () => {
      expect(await allows(cors, 'https://eattable.kr')).toBe(true);
      expect(await allows(cors, 'https://admin.eattable.kr')).toBe(true);
    });

    it('프로덕션에서는 localhost를 차단한다', async () => {
      expect(await allows(cors, 'http://localhost:3004')).toBe(false);
    });

    it('외부 출처는 차단한다', async () => {
      expect(await allows(cors, 'https://evil.example.com')).toBe(false);
    });
  });
});
