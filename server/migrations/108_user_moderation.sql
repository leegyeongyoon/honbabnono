-- 108: 관리자 사용자 차단(모더레이션) 컬럼
-- admin getUsers/blockUser가 참조하는 users.is_blocked 계열이 정본 스키마에 없어 500 발생 → 추가
-- 전부 멱등 (ADD COLUMN IF NOT EXISTS)

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_is_blocked ON users(is_blocked) WHERE is_blocked = true;

-- 구버전 프로덕션 호환(005 보강 재확인 — 005가 아직 적용 안 된 환경 대비 이중 안전)
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft';
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
