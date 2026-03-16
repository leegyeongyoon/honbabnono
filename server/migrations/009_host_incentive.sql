-- 호스트 인센티브 시스템 마이그레이션
-- 실행: psql -d honbabnono -f server/migrations/009_host_incentive.sql

-- 우수 호스트 추적용 컬럼 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_best_host BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS best_host_until TIMESTAMPTZ;

-- 인덱스: 우수 호스트 필터링 최적화
CREATE INDEX IF NOT EXISTS idx_users_is_best_host ON users (is_best_host) WHERE is_best_host = true;

-- 인덱스: 호스트 리워드 조회 최적화
CREATE INDEX IF NOT EXISTS idx_point_transactions_type ON point_transactions (type);
