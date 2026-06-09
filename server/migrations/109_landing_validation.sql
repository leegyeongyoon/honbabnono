-- 109: 가짜문(Fake Door) 검증 — 퍼널 이벤트 + 베타 신청 리드
-- 선결제 수용률 검증용. 전부 멱등(IF NOT EXISTS).

-- 퍼널 이벤트 (landing_view → menu_view → add_to_cart → reservation_intent → payment_click → lead_submit)
CREATE TABLE IF NOT EXISTS funnel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   VARCHAR(64) NOT NULL,   -- 클라이언트 생성(localStorage uuid)
  step         VARCHAR(40) NOT NULL,
  restaurant_ref VARCHAR(40),          -- 가상 매장 slug
  variant      VARCHAR(40),            -- 선결제 형태(full/deposit/course 등) A/B
  metadata     JSONB DEFAULT '{}',
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_funnel_events_step    ON funnel_events (step);
CREATE INDEX IF NOT EXISTS idx_funnel_events_session ON funnel_events (session_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_created ON funnel_events (created_at);

-- 베타 신청 리드
CREATE TABLE IF NOT EXISTS waitlist_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     VARCHAR(64),
  contact        VARCHAR(255) NOT NULL,
  contact_type   VARCHAR(20) NOT NULL DEFAULT 'email', -- email | phone | kakao
  restaurant_ref VARCHAR(40),
  variant        VARCHAR(40),
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_waitlist_leads_created ON waitlist_leads (created_at);
-- 같은 세션이 같은 연락처를 중복 제출하는 것 방지
CREATE UNIQUE INDEX IF NOT EXISTS uq_waitlist_session_contact
  ON waitlist_leads (session_id, contact)
  WHERE session_id IS NOT NULL;
