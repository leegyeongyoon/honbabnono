-- 009: 계정 삭제(익명화) 지원을 위한 is_active, deleted_at 컬럼 추가
-- 2026-03-12

-- is_active: 계정 활성 상태 (false = 탈퇴)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- deleted_at: 계정 삭제(익명화) 시점
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 탈퇴 사용자 필터링 인덱스
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active) WHERE is_active = false;
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;
