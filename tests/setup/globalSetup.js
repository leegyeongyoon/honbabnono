/**
 * Jest Global Setup
 * 테스트 시작 전 전역 설정
 *
 * - .env.test 로드 (이미 설정된 env는 보존 — CI가 주입한 DB_HOST 등이 우선)
 * - RDS(amazonaws.com) 오염 방지 가드
 * - 테스트 DB가 연결 가능하면 마이그레이션 자동 적용 (통합/플로우 테스트 대비)
 */
const path = require('path');

module.exports = async () => {
  // 테스트 환경변수 로드 (override:false — 셸/CI에서 주입한 값이 우선)
  require('dotenv').config({ path: path.join(__dirname, '../../.env.test'), override: false });

  // 전역 설정
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key';

  // 🛑 안전 가드: 테스트가 RDS(개발/프로덕션 DB)를 가리키면 즉시 중단
  if ((process.env.DB_HOST || '').includes('amazonaws.com')) {
    throw new Error(
      `테스트 DB로 RDS 호스트(${process.env.DB_HOST})를 사용할 수 없습니다. ` +
      '.env.test의 DB_HOST를 로컬/Tailscale 테스트 DB로 변경하세요. (개발 DB 오염 방지)'
    );
  }

  console.log('\n🧪 Jest Global Setup');
  console.log(`   환경: ${process.env.NODE_ENV}`);
  console.log(`   DB: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);

  // 테스트 DB 마이그레이션 자동 적용 (SKIP_DB_SETUP=true면 생략 — CI unit 잡 등)
  if (process.env.SKIP_DB_SETUP === 'true') {
    console.log('   마이그레이션: 생략 (SKIP_DB_SETUP=true)');
    return;
  }

  const pool = require('../../server/config/database');
  try {
    try {
      // 짧은 연결 확인 — DB가 없으면(유닛 전용 실행 등) 경고만 하고 진행
      await pool.query('SELECT 1');
    } catch (err) {
      console.warn(`   ⚠️ 테스트 DB 연결 불가(${err.message}) — 유닛 테스트만 가능, 통합 테스트는 실패합니다.`);
      return;
    }

    try {
      // 빈 DB면 베이스 스키마(v1 테이블 — 마이그레이션 이전 SSOT) 먼저 부트스트랩
      const { rows } = await pool.query("SELECT to_regclass('public.users') AS users_table");
      if (!rows[0].users_table) {
        const fs = require('fs');
        const schemaSql = fs.readFileSync(path.join(__dirname, '../../database_schema_clean.sql'), 'utf8');
        await pool.query(schemaSql);
        console.log('   베이스 스키마: database_schema_clean.sql 적용 완료 (fresh DB)');
      }

      const { run } = require('../../server/migrations/runner');
      await run();
      console.log('   마이그레이션: 최신 상태 확인 완료');
    } catch (err) {
      throw new Error(`테스트 DB 마이그레이션 실패: ${err.message}`);
    }
  } finally {
    // globalSetup 프로세스의 풀은 여기서 정리 (워커는 각자 새 풀 생성)
    await pool.end().catch(() => {});
  }
};
