-- Migration 005: Add missing tables (badges, user_badges, advertisements) + indexes + FK constraints
-- Date: 2026-03-06

-- 1. Badges table
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  required_count INTEGER DEFAULT 1,
  icon VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. User badges table
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP DEFAULT NOW(),
  is_featured BOOLEAN DEFAULT false,
  UNIQUE(user_id, badge_id)
);

-- 3. Advertisements table
CREATE TABLE IF NOT EXISTS advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  link_url VARCHAR(500),
  advertiser_name VARCHAR(100),
  status VARCHAR(20) DEFAULT 'draft',
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  click_count INTEGER DEFAULT 0,
  impression_count INTEGER DEFAULT 0,
  position VARCHAR(50) DEFAULT 'banner',
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Performance indexes
CREATE INDEX IF NOT EXISTS idx_meetups_status_date ON meetups(status, date);
CREATE INDEX IF NOT EXISTS idx_meetups_host_id ON meetups(host_id);
CREATE INDEX IF NOT EXISTS idx_meetup_participants_meetup_user ON meetup_participants(meetup_id, user_id);
CREATE INDEX IF NOT EXISTS idx_attendances_meetup_id ON attendances(meetup_id);
CREATE INDEX IF NOT EXISTS idx_reviews_meetup_id ON reviews(meetup_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_promise_deposits_meetup_user ON promise_deposits(meetup_id, user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_advertisements_status ON advertisements(status, is_active);

-- 5. FK constraints (safe add with DO block)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendances_meetup') THEN
    ALTER TABLE attendances ADD CONSTRAINT fk_attendances_meetup
      FOREIGN KEY (meetup_id) REFERENCES meetups(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_attendances_user') THEN
    ALTER TABLE attendances ADD CONSTRAINT fk_attendances_user
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 6. Seed default badges
INSERT INTO badges (name, description, category, required_count, icon) VALUES
  ('첫 모임', '첫 번째 모임에 참가했습니다', 'participation', 1, 'first-meetup'),
  ('단골손님', '10번째 모임에 참가했습니다', 'participation', 10, 'regular'),
  ('모임왕', '50번째 모임에 참가했습니다', 'participation', 50, 'meetup-king'),
  ('첫 호스트', '첫 번째 모임을 개설했습니다', 'hosting', 1, 'first-host'),
  ('인기 호스트', '10번째 모임을 개설했습니다', 'hosting', 10, 'popular-host'),
  ('리뷰어', '첫 리뷰를 작성했습니다', 'review', 1, 'first-review'),
  ('평론가', '10번째 리뷰를 작성했습니다', 'review', 10, 'critic'),
  ('매너왕', '밥알지수 90 이상을 달성했습니다', 'score', 1, 'manner-king'),
  ('약속의 달인', '노쇼 없이 20회 연속 참가했습니다', 'attendance', 20, 'no-noshow')
ON CONFLICT DO NOTHING;
