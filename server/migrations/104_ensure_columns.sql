-- 104: 누락 가능한 컬럼 보장 (103 미실행 대비)
-- 모든 ALTER는 IF NOT EXISTS로 안전하게 실행

-- payments 추가 컬럼
DO $$ BEGIN
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS pg_provider VARCHAR(50);
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS card_name VARCHAR(50);
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS card_number VARCHAR(30);
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS receipt_url TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- orders 추가 컬럼
DO $$ BEGIN
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS reject_reason TEXT;
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_ready_at TIMESTAMPTZ;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- restaurants 추가 컬럼
DO $$ BEGIN
  ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS auto_accept_orders BOOLEAN DEFAULT false;
  ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS default_prep_time INTEGER DEFAULT 20;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- merchants 추가 컬럼
DO $$ BEGIN
  ALTER TABLE merchants ADD COLUMN IF NOT EXISTS verification_docs JSONB DEFAULT '[]'::jsonb;
  ALTER TABLE merchants ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- settlements 추가 컬럼
DO $$ BEGIN
  ALTER TABLE settlements ADD COLUMN IF NOT EXISTS payment_fee DECIMAL(10,2) DEFAULT 0;
  ALTER TABLE settlements ADD COLUMN IF NOT EXISTS fee_rate DECIMAL(5,4) DEFAULT 0.05;
  ALTER TABLE settlements ADD COLUMN IF NOT EXISTS payment_fee_rate DECIMAL(5,4) DEFAULT 0.03;
  ALTER TABLE settlements ADD COLUMN IF NOT EXISTS order_count INTEGER DEFAULT 0;
  ALTER TABLE settlements ADD COLUMN IF NOT EXISTS bank_name VARCHAR(50);
  ALTER TABLE settlements ADD COLUMN IF NOT EXISTS bank_account VARCHAR(50);
  ALTER TABLE settlements ADD COLUMN IF NOT EXISTS bank_holder VARCHAR(50);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- menu_option_groups 테이블 (없으면 생성)
CREATE TABLE IF NOT EXISTS menu_option_groups (
    id SERIAL PRIMARY KEY,
    menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_required BOOLEAN DEFAULT false,
    max_select INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- menu_option_items 테이블 (없으면 생성)
CREATE TABLE IF NOT EXISTS menu_option_items (
    id SERIAL PRIMARY KEY,
    option_group_id INTEGER NOT NULL REFERENCES menu_option_groups(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    price INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- restaurant_refund_policies 테이블 (없으면 생성)
CREATE TABLE IF NOT EXISTS restaurant_refund_policies (
    id SERIAL PRIMARY KEY,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    days_before INTEGER NOT NULL,
    refund_rate DECIMAL(3,2) NOT NULL DEFAULT 1.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(restaurant_id, days_before)
);

-- settlement_items 테이블 (없으면 생성)
CREATE TABLE IF NOT EXISTS settlement_items (
    id SERIAL PRIMARY KEY,
    settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id),
    reservation_id UUID NOT NULL REFERENCES reservations(id),
    order_amount DECIMAL(10,2) NOT NULL,
    platform_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    net_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- restaurant_time_slots에 updated_at 추가
DO $$ BEGIN
  ALTER TABLE restaurant_time_slots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
