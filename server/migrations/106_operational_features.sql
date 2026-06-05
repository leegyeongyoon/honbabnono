-- 106: 매장 운영 기능 — 예약 일시중지 / 휴무일 / 예약 상한 / 수동(게스트) 예약
-- 전부 멱등 (IF NOT EXISTS / 안전한 ALTER)

-- =============================================
-- 1. restaurants: 예약 일시중지 + 휴무일 + 예약 가능 기간 상한
-- =============================================
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS is_accepting_reservations BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS pause_reason TEXT;             -- 일시중지 사유 (고객 노출)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS paused_until TIMESTAMPTZ;      -- 자동 재개 시각 (NULL이면 수동 재개)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS holidays JSONB DEFAULT '[]';   -- 휴무일 배열 ["2026-06-06", ...]
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS max_advance_days INTEGER;      -- 예약 가능 일수 상한 (NULL이면 env 기본 30)

COMMENT ON COLUMN restaurants.is_accepting_reservations IS '예약 접수 토글 — false면 createReservation 차단';
COMMENT ON COLUMN restaurants.holidays IS '특정 휴무일 YYYY-MM-DD 배열 — 해당 날짜 예약 차단';

-- =============================================
-- 2. reservations: 점주 수동(전화) 예약 — 게스트 정보
-- =============================================
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS guest_name VARCHAR(50);   -- 게스트 이름 (user_id 없을 때)
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(20);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS is_manual BOOLEAN NOT NULL DEFAULT false; -- 점주 수동 등록 여부

-- 게스트 예약은 user_id 없음 — 조회 측은 LEFT JOIN + COALESCE(u.name, r.guest_name) 사용
ALTER TABLE reservations ALTER COLUMN user_id DROP NOT NULL;
