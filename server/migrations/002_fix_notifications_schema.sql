-- 002: notifications 테이블 인덱스 최적화
--
-- 실제 DB 스키마: id, user_id, type, title, message, meetup_id, related_user_id,
--               data(jsonb), is_read, is_sent, scheduled_at, sent_at, created_at, updated_at
--
-- 실행: psql -d honbabnono -f server/migrations/002_fix_notifications_schema.sql

-- 1. meetup_id 인덱스 (스케줄러 중복 체크 성능)
CREATE INDEX IF NOT EXISTS idx_notifications_meetup_id ON notifications (meetup_id) WHERE meetup_id IS NOT NULL;

-- 2. type + meetup_id 복합 인덱스 (스케줄러 NOT IN 쿼리 성능)
CREATE INDEX IF NOT EXISTS idx_notifications_type_meetup_id ON notifications (type, meetup_id) WHERE meetup_id IS NOT NULL;

-- 3. user_id + is_read 인덱스 (읽지 않은 알림 조회 성능)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, is_read) WHERE is_read = false;

-- 4. data JSONB 인덱스 (메타데이터 검색)
CREATE INDEX IF NOT EXISTS idx_notifications_data ON notifications USING GIN (data);

-- 5. created_at 인덱스 (최신순 조회 성능)
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at DESC);
