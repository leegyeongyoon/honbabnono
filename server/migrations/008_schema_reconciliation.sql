-- =============================================
-- Migration 008: 스키마 정합성 복구 (코드 ↔ DB 불일치 전면 해소)
-- Date: 2026-03-11
-- Description:
--   코드에서 참조하지만 DB에 존재하지 않는 테이블/컬럼을 모두 추가.
--   모든 구문은 IF NOT EXISTS / ADD COLUMN IF NOT EXISTS 사용하여
--   여러 번 실행해도 안전(idempotent).
--
-- 변경 목록:
--   1. 누락 테이블 생성
--      - babal_score_history (server/utils/babalScore.js)
--      - location_verifications (server/modules/meetups/controller.js)
--      - meetup_preference_filters (server/modules/meetups/controllers/crud.controller.js)
--      - admins (server/modules/admin/controller.js)
--   2. meetups 테이블 누락 컬럼 추가
--      - image, address, view_count
--      - promise_deposit_amount, promise_deposit_required
--      - tags, dining_preferences, allow_direct_chat
--   3. users 테이블 누락 컬럼 추가
--      - direct_chat_setting
--   4. meetup_participants 테이블 누락 컬럼 추가
--      - created_at
--   5. advertisements 테이블 누락 컬럼 추가
--      - use_detail_page, detail_content, business_name, contact_info, view_count
--   6. 성능 인덱스 추가
-- =============================================

BEGIN;

-- =============================================
-- 1. 누락 테이블 생성
-- =============================================

-- 1-1. babal_score_history (밥알지수 변동 이력)
CREATE TABLE IF NOT EXISTS babal_score_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    previous_score NUMERIC(4,1) NOT NULL,
    new_score NUMERIC(4,1) NOT NULL,
    change_amount NUMERIC(4,1) NOT NULL,
    reason TEXT,
    related_meetup_id UUID REFERENCES meetups(id) ON DELETE SET NULL,
    related_review_id UUID REFERENCES reviews(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 1-2. location_verifications (모임 위치 인증 기록)
CREATE TABLE IF NOT EXISTS location_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meetup_id UUID NOT NULL REFERENCES meetups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    accuracy DECIMAL(10,2),
    distance INTEGER,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 1-3. meetup_preference_filters (모임 선호 성향 필터)
CREATE TABLE IF NOT EXISTS meetup_preference_filters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meetup_id UUID NOT NULL REFERENCES meetups(id) ON DELETE CASCADE UNIQUE,
    eating_speed VARCHAR(50) DEFAULT 'no_preference',
    conversation_during_meal VARCHAR(50) DEFAULT 'no_preference',
    talkativeness VARCHAR(50) DEFAULT 'no_preference',
    meal_purpose VARCHAR(50) DEFAULT 'no_preference',
    specific_restaurant TEXT,
    interests TEXT[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 1-4. admins (관리자 계정)
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(50) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- =============================================
-- 2. meetups 테이블 누락 컬럼 추가
-- =============================================

-- 코드에서 m.image 로 참조 (스키마에는 image_url 만 있음)
ALTER TABLE meetups ADD COLUMN IF NOT EXISTS image TEXT;

-- 코드에서 m.address 로 참조 (스키마에는 detailed_location 만 있음)
ALTER TABLE meetups ADD COLUMN IF NOT EXISTS address TEXT;

-- 조회수 (crud.controller.js:67 에서 UPDATE meetups SET view_count = ...)
ALTER TABLE meetups ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- 약속금 금액 (query.helper.js:150, list.controller.js:35 등)
ALTER TABLE meetups ADD COLUMN IF NOT EXISTS promise_deposit_amount INTEGER DEFAULT 0;

-- 약속금 필수 여부 (query.helper.js:150, user/controller.js:470 등)
ALTER TABLE meetups ADD COLUMN IF NOT EXISTS promise_deposit_required BOOLEAN DEFAULT false;

-- 태그 (crud.controller.js:24 m.tags)
ALTER TABLE meetups ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';

-- 식사 선호도 (crud.controller.js:23 m.dining_preferences)
ALTER TABLE meetups ADD COLUMN IF NOT EXISTS dining_preferences JSONB DEFAULT '{}';

-- 1:1 채팅 허용 (chat/controller.js:51 allow_direct_chat)
ALTER TABLE meetups ADD COLUMN IF NOT EXISTS allow_direct_chat BOOLEAN DEFAULT true;

-- age_range, gender_preference (migration 002에서 추가되었지만 안전을 위해)
ALTER TABLE meetups ADD COLUMN IF NOT EXISTS age_range VARCHAR(50);
ALTER TABLE meetups ADD COLUMN IF NOT EXISTS gender_preference VARCHAR(20);

-- requirements 컬럼 (crud.controller.js:24 m.requirements)
ALTER TABLE meetups ADD COLUMN IF NOT EXISTS requirements TEXT;


-- =============================================
-- 3. users 테이블 누락 컬럼 추가
-- =============================================

-- 1:1 채팅 설정 (chat/controller.js:24)
-- 값: 'ALLOW_ALL', 'SAME_GENDER', 'BLOCKED'
ALTER TABLE users ADD COLUMN IF NOT EXISTS direct_chat_setting VARCHAR(20) DEFAULT 'ALLOW_ALL';


-- =============================================
-- 4. meetup_participants 테이블 누락 컬럼 추가
-- =============================================

-- 코드에서 created_at 를 INSERT 시 사용 (participation.controller.js:124, crud.controller.js:194)
ALTER TABLE meetup_participants ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- no_show 컬럼 (user/controller.js:336, noShowProcessing.js 등)
ALTER TABLE meetup_participants ADD COLUMN IF NOT EXISTS no_show BOOLEAN DEFAULT false;

-- no_show_confirmed 컬럼 (스키마에 정의되어 있지만 안전을 위해)
ALTER TABLE meetup_participants ADD COLUMN IF NOT EXISTS no_show_confirmed BOOLEAN DEFAULT false;


-- =============================================
-- 5. advertisements 테이블 누락 컬럼 추가
-- =============================================

-- 상세페이지 사용 여부 (advertisements/controller.js:31)
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS use_detail_page BOOLEAN DEFAULT false;

-- 상세 컨텐츠 (advertisements/controller.js:31)
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS detail_content TEXT;

-- 사업체 이름 (advertisements/controller.js:32)
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS business_name VARCHAR(255);

-- 연락처 정보 (advertisements/controller.js:32)
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS contact_info VARCHAR(255);

-- 조회 수 (advertisements/controller.js:35 — 005에서 click_count/impression_count만 있고 view_count 없음)
ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;


-- =============================================
-- 6. 기존 데이터 마이그레이션 (image_url → image, detailed_location → address)
-- =============================================

-- image_url 에 값이 있고 image 가 NULL 인 경우 복사
UPDATE meetups SET image = image_url WHERE image IS NULL AND image_url IS NOT NULL;

-- detailed_location 에 값이 있고 address 가 NULL 인 경우 복사
UPDATE meetups SET address = detailed_location WHERE address IS NULL AND detailed_location IS NOT NULL;


-- =============================================
-- 7. 성능 인덱스 추가
-- =============================================

-- babal_score_history 인덱스
CREATE INDEX IF NOT EXISTS idx_babal_score_history_user_id
    ON babal_score_history(user_id);
CREATE INDEX IF NOT EXISTS idx_babal_score_history_created_at
    ON babal_score_history(created_at DESC);

-- location_verifications 인덱스
CREATE INDEX IF NOT EXISTS idx_location_verifications_meetup_id
    ON location_verifications(meetup_id);
CREATE INDEX IF NOT EXISTS idx_location_verifications_user_id
    ON location_verifications(user_id);

-- meetup_preference_filters 인덱스
CREATE INDEX IF NOT EXISTS idx_meetup_preference_filters_meetup_id
    ON meetup_preference_filters(meetup_id);

-- admins 인덱스
CREATE INDEX IF NOT EXISTS idx_admins_username
    ON admins(username);
CREATE INDEX IF NOT EXISTS idx_admins_is_active
    ON admins(is_active);

-- meetups 추가 인덱스 (promise_deposit, view_count)
CREATE INDEX IF NOT EXISTS idx_meetups_promise_deposit_required
    ON meetups(promise_deposit_required) WHERE promise_deposit_required = true;
CREATE INDEX IF NOT EXISTS idx_meetups_view_count
    ON meetups(view_count DESC);
CREATE INDEX IF NOT EXISTS idx_meetups_allow_direct_chat
    ON meetups(allow_direct_chat);

-- users direct_chat_setting 인덱스
CREATE INDEX IF NOT EXISTS idx_users_direct_chat_setting
    ON users(direct_chat_setting);

-- meetup_participants composite 인덱스 (노쇼 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_meetup_participants_no_show
    ON meetup_participants(user_id, no_show) WHERE no_show = true;

-- meetups date + status 복합 인덱스 (홈화면 등 빈번 조회)
CREATE INDEX IF NOT EXISTS idx_meetups_status_date_time
    ON meetups(status, date, time);

-- advertisements 추가 인덱스
CREATE INDEX IF NOT EXISTS idx_advertisements_position_active
    ON advertisements(position, is_active) WHERE is_active = true;


-- =============================================
-- 8. updated_at 트리거 (신규 테이블용)
-- =============================================

-- update_updated_at_column 함수는 이미 존재한다고 가정 (database_schema_clean.sql에 정의)

-- babal_score_history 는 created_at 만 있으므로 updated_at 트리거 불필요
-- location_verifications 도 마찬가지

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_meetup_preference_filters_updated_at') THEN
        CREATE TRIGGER update_meetup_preference_filters_updated_at
            BEFORE UPDATE ON meetup_preference_filters
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_admins_updated_at') THEN
        CREATE TRIGGER update_admins_updated_at
            BEFORE UPDATE ON admins
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

COMMIT;
