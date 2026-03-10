-- =====================================
-- 007: 리뷰 답변 기능 추가
-- =====================================

-- reviews 테이블에 답변 컬럼 추가
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reply TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reply_at TIMESTAMP WITH TIME ZONE;

-- is_featured 컬럼 추가 (추천 리뷰)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- 인덱스 추가 (받은 리뷰 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
