-- =====================================
-- 혼밥시러 식사 성향 필터 데이터베이스 스키마
-- =====================================

-- 1. 모임 필터 설정 테이블 (meetups 테이블 확장)
-- meetups 테이블에 컬럼 추가
ALTER TABLE meetups ADD COLUMN IF NOT EXISTS dining_preferences JSONB DEFAULT '{}';

-- 2. 모임 성향 필터 템플릿 테이블
CREATE TABLE IF NOT EXISTS meetup_preference_filters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meetup_id UUID NOT NULL REFERENCES meetups(id) ON DELETE CASCADE,
    
    -- 기본 조건 (필수)
    gender_filter VARCHAR(10) NOT NULL DEFAULT 'anyone', -- 'male', 'female', 'anyone'
    age_filter_min INTEGER DEFAULT 18,
    age_filter_max INTEGER DEFAULT 100,
    location_filter VARCHAR(255) NOT NULL,
    
    -- 식사 성향 (선택)
    eating_speed VARCHAR(20) DEFAULT 'no_preference', -- 'fast', 'slow', 'no_preference'
    conversation_during_meal VARCHAR(50) DEFAULT 'no_preference', -- 'quiet', 'no_talk', 'chatty', 'no_preference'
    introvert_level INTEGER DEFAULT NULL, -- 1-10 (빨간색으로 표시)
    extrovert_level INTEGER DEFAULT NULL, -- 1-10 (파란색으로 표시)
    
    -- 대화 성향 (선택)
    talkativeness VARCHAR(20) DEFAULT 'no_preference', -- 'talkative', 'listener', 'moderate', 'no_preference'
    
    -- 관심사 (선택) - JSON 배열
    interests TEXT[] DEFAULT ARRAY[]::TEXT[], -- ['movie', 'IT', 'exercise', 'hobby', 'book', 'anime']
    
    -- 음식 조건 (필수)
    food_category VARCHAR(50) NOT NULL DEFAULT 'no_preference', -- 'korean', 'western', 'japanese', 'dessert', 'no_preference'
    specific_restaurant VARCHAR(255) DEFAULT NULL, -- 특정 가게 지정
    
    -- 목적성 (선택)
    meal_purpose VARCHAR(30) DEFAULT 'no_preference', -- 'networking', 'info_sharing', 'hobby_friendship', 'just_meal', 'no_preference'
    
    -- 메타데이터
    is_required BOOLEAN DEFAULT false, -- 참석 시 답변 필수 여부 (false = 선택적)
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. 모임 참가자 성향 답변 테이블
CREATE TABLE IF NOT EXISTS meetup_participant_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meetup_id UUID NOT NULL REFERENCES meetups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 기본 정보는 users 테이블에서 가져오므로 생략
    
    -- 식사 성향 답변
    eating_speed VARCHAR(20) DEFAULT NULL,
    conversation_during_meal VARCHAR(50) DEFAULT NULL,
    introvert_level INTEGER DEFAULT NULL, -- 1-10
    extrovert_level INTEGER DEFAULT NULL, -- 1-10
    
    -- 대화 성향 답변
    talkativeness VARCHAR(20) DEFAULT NULL,
    
    -- 관심사 답변
    interests TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- 음식 선호도 (모임장이 설정한 카테고리 내에서)
    food_preference_notes TEXT DEFAULT NULL,
    
    -- 목적성 답변
    meal_purpose VARCHAR(30) DEFAULT NULL,
    
    -- 자유 입력 필드
    additional_notes TEXT DEFAULT NULL,
    bio TEXT DEFAULT NULL, -- 간단한 자기소개
    
    -- 메타데이터
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 중복 방지
    UNIQUE(meetup_id, user_id)
);

-- 4. 성향 매칭 점수 테이블 (선택적 - 추후 매칭 알고리즘용)
CREATE TABLE IF NOT EXISTS meetup_compatibility_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meetup_id UUID NOT NULL REFERENCES meetups(id) ON DELETE CASCADE,
    user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 각 항목별 매칭 점수 (0-100)
    overall_score INTEGER DEFAULT 0,
    eating_compatibility INTEGER DEFAULT 0,
    conversation_compatibility INTEGER DEFAULT 0,
    interest_compatibility INTEGER DEFAULT 0,
    purpose_compatibility INTEGER DEFAULT 0,
    
    -- 메타데이터
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 중복 방지 및 순서 무관
    UNIQUE(meetup_id, user1_id, user2_id),
    CHECK (user1_id != user2_id),
    CHECK (user1_id < user2_id) -- 순서 정규화
);

-- 5. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_meetup_preference_filters_meetup_id ON meetup_preference_filters(meetup_id);
CREATE INDEX IF NOT EXISTS idx_meetup_participant_preferences_meetup_id ON meetup_participant_preferences(meetup_id);
CREATE INDEX IF NOT EXISTS idx_meetup_participant_preferences_user_id ON meetup_participant_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_meetup_compatibility_scores_meetup_id ON meetup_compatibility_scores(meetup_id);

-- 6. 트리거 생성 (updated_at 자동 업데이트)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_meetup_preference_filters_updated_at 
    BEFORE UPDATE ON meetup_preference_filters 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetup_participant_preferences_updated_at 
    BEFORE UPDATE ON meetup_participant_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. 기본 데이터 삽입 (예시)
-- 샘플 모임에 대한 필터 설정
INSERT INTO meetup_preference_filters (meetup_id, gender_filter, age_filter_min, age_filter_max, location_filter, food_category, is_required)
SELECT 
    id,
    'anyone',
    20,
    35,
    location,
    CASE category 
        WHEN '한식' THEN 'korean'
        WHEN '일식' THEN 'japanese'
        WHEN '양식' THEN 'western'
        ELSE 'no_preference'
    END,
    false
FROM meetups 
WHERE id IN (
    SELECT id FROM meetups LIMIT 3
)
ON CONFLICT DO NOTHING;

-- 8. 뷰 생성 (모임별 참가자 성향 요약)
CREATE OR REPLACE VIEW meetup_participants_summary AS
SELECT 
    m.id as meetup_id,
    m.title,
    m.date,
    m.time,
    m.location,
    COUNT(mp.user_id) as total_participants,
    COUNT(mpp.user_id) as answered_participants,
    ROUND(COUNT(mpp.user_id)::decimal / NULLIF(COUNT(mp.user_id), 0) * 100, 2) as answer_rate,
    
    -- 성향 분포
    COUNT(CASE WHEN mpp.eating_speed = 'fast' THEN 1 END) as fast_eaters,
    COUNT(CASE WHEN mpp.eating_speed = 'slow' THEN 1 END) as slow_eaters,
    COUNT(CASE WHEN mpp.talkativeness = 'talkative' THEN 1 END) as talkative_people,
    COUNT(CASE WHEN mpp.talkativeness = 'listener' THEN 1 END) as listeners,
    ROUND(AVG(mpp.introvert_level), 1) as avg_introvert_level,
    ROUND(AVG(mpp.extrovert_level), 1) as avg_extrovert_level
    
FROM meetups m
LEFT JOIN meetup_participants mp ON m.id = mp.meetup_id
LEFT JOIN meetup_participant_preferences mpp ON m.id = mpp.meetup_id AND mp.user_id = mpp.user_id
WHERE mp.status = '참가승인'
GROUP BY m.id, m.title, m.date, m.time, m.location;

-- 9. 코멘트 추가
COMMENT ON TABLE meetup_preference_filters IS '모임별 참석자 필터링 조건 설정';
COMMENT ON TABLE meetup_participant_preferences IS '모임 참가자들의 식사 성향 답변';
COMMENT ON TABLE meetup_compatibility_scores IS '참가자 간 성향 매칭 점수 (선택적)';
COMMENT ON VIEW meetup_participants_summary IS '모임별 참가자 성향 요약 통계';

-- 10. 권한 설정 (필요시)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT SELECT ON ALL VIEWS IN SCHEMA public TO app_user;