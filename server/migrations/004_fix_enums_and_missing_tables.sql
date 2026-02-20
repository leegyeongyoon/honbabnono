-- 마이그레이션: 누락 테이블/컬럼 추가
-- 날짜: 2026-02-20
-- 참고: 실제 DB ENUM은 이미 올바른 값 사용 중
--   participant_status: '참가신청', '참가승인', '참가거절', '참가취소'
--   meetup_status: '모집중', '모집완료', '진행중', '종료', '취소'

-- =====================================
-- 1. user_reviews 테이블 생성 (참가자 간 개별 리뷰)
-- =====================================

CREATE TABLE IF NOT EXISTS user_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meetup_id UUID NOT NULL REFERENCES meetups(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewed_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    tags TEXT[],
    is_anonymous BOOLEAN DEFAULT false,
    reported_noshow BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(meetup_id, reviewer_id, reviewed_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_reviews_meetup_id ON user_reviews(meetup_id);
CREATE INDEX IF NOT EXISTS idx_user_reviews_reviewer_id ON user_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_user_reviews_reviewed_user_id ON user_reviews(reviewed_user_id);


-- =====================================
-- 2. user_penalties 테이블 생성 (노쇼 패널티)
-- =====================================

CREATE TABLE IF NOT EXISTS user_penalties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meetup_id UUID REFERENCES meetups(id) ON DELETE SET NULL,
    penalty_type VARCHAR(50) NOT NULL,
    penalty_amount INTEGER NOT NULL DEFAULT 0,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_penalties_user_id ON user_penalties(user_id);


-- =====================================
-- 3. meetup_participants 누락 컬럼 추가
-- =====================================

ALTER TABLE meetup_participants
  ADD COLUMN IF NOT EXISTS progress_response TEXT;

ALTER TABLE meetup_participants
  ADD COLUMN IF NOT EXISTS progress_responded_at TIMESTAMP WITH TIME ZONE;


-- =====================================
-- 4. attendances 테이블에 updated_at 추가
-- =====================================

ALTER TABLE attendances
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
