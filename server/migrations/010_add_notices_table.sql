-- 공지사항 테이블 생성
-- 코드에서 notices 테이블을 참조하지만 database_schema_clean.sql에 정의되어 있지 않음

CREATE TABLE IF NOT EXISTS notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'general',       -- general, event, maintenance, update
    is_pinned BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    views INTEGER DEFAULT 0,
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_notices_is_active ON notices(is_active);
CREATE INDEX IF NOT EXISTS idx_notices_is_pinned ON notices(is_pinned DESC, created_at DESC);

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_notices_updated_at
    BEFORE UPDATE ON notices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
