-- =============================================
-- 마이그레이션 002: 밥알지수 리뉴얼 + 성별/나이 필터
-- 날짜: 2026-03-09
-- 설명:
--   1. users 테이블에 gender, birth_date 추가
--   2. babal_score를 INTEGER → NUMERIC(4,1)로 변경 (36.5 시작)
--   3. meetups 테이블에 age_range, gender_preference 컬럼 확인
--   4. babal_score_history 테이블 score 타입도 NUMERIC 으로 변경
-- =============================================

-- 1. users 테이블에 gender, birth_date 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(10);
-- gender: 'male', 'female', 'other'

ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date DATE;

-- 2. babal_score를 NUMERIC(4,1)으로 변경 (소수점 지원 - 당근 매너온도 스타일)
ALTER TABLE users ALTER COLUMN babal_score TYPE NUMERIC(4,1) USING babal_score::NUMERIC(4,1);
ALTER TABLE users ALTER COLUMN babal_score SET DEFAULT 36.5;

-- 기존 유저 중 40점인 유저는 36.5로 변경 (초기값이었던 유저들)
UPDATE users SET babal_score = 36.5 WHERE babal_score = 40;

-- 3. babal_score_history 테이블도 NUMERIC으로 변경
ALTER TABLE babal_score_history ALTER COLUMN previous_score TYPE NUMERIC(4,1) USING previous_score::NUMERIC(4,1);
ALTER TABLE babal_score_history ALTER COLUMN new_score TYPE NUMERIC(4,1) USING new_score::NUMERIC(4,1);
ALTER TABLE babal_score_history ALTER COLUMN change_amount TYPE NUMERIC(4,1) USING change_amount::NUMERIC(4,1);

-- 4. meetups 테이블 age_range, gender_preference 컬럼 확인 (이미 있으면 무시)
ALTER TABLE meetups ADD COLUMN IF NOT EXISTS age_range VARCHAR(50);
ALTER TABLE meetups ADD COLUMN IF NOT EXISTS gender_preference VARCHAR(20);

-- 5. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_users_gender ON users(gender);
CREATE INDEX IF NOT EXISTS idx_users_birth_date ON users(birth_date);
CREATE INDEX IF NOT EXISTS idx_meetups_gender_preference ON meetups(gender_preference);

-- 6. meetup_participants에 attended, attended_at 컬럼 확인
ALTER TABLE meetup_participants ADD COLUMN IF NOT EXISTS attended BOOLEAN DEFAULT false;
ALTER TABLE meetup_participants ADD COLUMN IF NOT EXISTS attended_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE meetup_participants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 7. attendances 테이블 (이미 있으면 무시)
CREATE TABLE IF NOT EXISTS attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meetup_id UUID NOT NULL REFERENCES meetups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attendance_type VARCHAR(20) NOT NULL DEFAULT 'gps',
    location_latitude DECIMAL(10, 8),
    location_longitude DECIMAL(11, 8),
    qr_code_data TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    confirmed_at TIMESTAMP WITH TIME ZONE,
    confirmed_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(meetup_id, user_id)
);

-- 8. mutual_confirmations 테이블 (이미 있으면 무시)
CREATE TABLE IF NOT EXISTS mutual_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meetup_id UUID NOT NULL REFERENCES meetups(id) ON DELETE CASCADE,
    confirmer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    confirmed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(meetup_id, confirmer_id, confirmed_id)
);
