-- ============================================================
-- 잇테이블 v2 고도화: 점주 시스템 업그레이드
-- Phase A: 메뉴 옵션 시스템
-- Phase B: 사업자 인증 고도화
-- Phase C: 결제 시스템
-- Phase D: 정산 시스템
-- Phase E: 주문 관리 고도화
-- ============================================================

-- =============================================
-- Phase A: 메뉴 옵션 그룹 시스템
-- =============================================

-- 메뉴 옵션 그룹 (예: "맵기 선택", "사이즈 선택")
CREATE TABLE IF NOT EXISTS menu_option_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    is_required BOOLEAN DEFAULT false,
    min_select INTEGER DEFAULT 0,
    max_select INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_option_groups_menu_id ON menu_option_groups(menu_id);

-- 메뉴 옵션 아이템 (예: "순한맛 +0원", "매운맛 +500원")
CREATE TABLE IF NOT EXISTS menu_option_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    option_group_id UUID NOT NULL REFERENCES menu_option_groups(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    additional_price INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_option_items_group_id ON menu_option_items(option_group_id);

-- =============================================
-- Phase B: 사업자 인증 고도화
-- =============================================

-- merchants 테이블에 서류 관련 컬럼 추가
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS verification_docs JSONB DEFAULT '{}';
-- verification_docs 구조:
-- {
--   "business_license": "s3://...",     -- 사업자등록증
--   "business_permit": "s3://...",      -- 영업신고증
--   "bank_account_copy": "s3://..."     -- 통장사본
-- }

ALTER TABLE merchants ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- =============================================
-- Phase C: 결제 시스템 보강
-- =============================================

-- payments 테이블에 결제 게이트웨이 관련 컬럼 추가
ALTER TABLE payments ADD COLUMN IF NOT EXISTS pg_provider VARCHAR(30);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS card_name VARCHAR(50);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS card_number VARCHAR(30);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- 매장별 환불 정책
CREATE TABLE IF NOT EXISTS restaurant_refund_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    days_before INTEGER NOT NULL,
    refund_rate INTEGER NOT NULL CHECK (refund_rate BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT refund_policy_unique UNIQUE(restaurant_id, days_before)
);

-- 기본 환불 정책 예시: 3일전 100%, 2일전 100%, 1일전 50%, 당일 0%

-- =============================================
-- Phase D: 정산 시스템 보강
-- =============================================

-- settlements 테이블에 세부 항목 추가
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS payment_fee INTEGER DEFAULT 0;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS fee_rate NUMERIC(4,2) DEFAULT 5.00;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS payment_fee_rate NUMERIC(4,2) DEFAULT 3.00;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS order_count INTEGER DEFAULT 0;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS bank_name VARCHAR(50);
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS bank_account VARCHAR(50);
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS bank_holder VARCHAR(50);

-- 정산 상세 (개별 주문 단위)
CREATE TABLE IF NOT EXISTS settlement_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id),
    reservation_id UUID NOT NULL REFERENCES reservations(id),
    order_amount INTEGER NOT NULL,
    platform_fee INTEGER NOT NULL,
    payment_fee INTEGER NOT NULL,
    net_amount INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settlement_items_settlement_id ON settlement_items(settlement_id);

-- =============================================
-- Phase E: 주문 관리 고도화
-- =============================================

-- restaurants 테이블에 자동접수/기본 조리시간 설정
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS auto_accept_orders BOOLEAN DEFAULT false;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS default_prep_time INTEGER DEFAULT 20;

-- orders 테이블에 거절 사유 추가
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reject_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_ready_at TIMESTAMPTZ;
