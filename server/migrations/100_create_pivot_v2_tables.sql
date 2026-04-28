-- ============================================================
-- 잇테이블 v2 피벗: 선주문/선결제형 외식 예약 플랫폼
-- 13개 신규 테이블 생성
-- 기존 테이블은 DROP하지 않음
-- ============================================================

-- 1. restaurants (매장)
CREATE TABLE IF NOT EXISTS restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    phone VARCHAR(20),
    address TEXT NOT NULL,
    address_detail VARCHAR(255),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    image_url TEXT,
    images JSONB DEFAULT '[]',
    operating_hours JSONB,
    seat_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT false,
    avg_rating NUMERIC(2,1) DEFAULT 0.0,
    review_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_restaurants_category ON restaurants(category);
CREATE INDEX IF NOT EXISTS idx_restaurants_is_active ON restaurants(is_active);
CREATE INDEX IF NOT EXISTS idx_restaurants_location ON restaurants(latitude, longitude);

-- 2. merchants (점주)
CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    restaurant_id UUID REFERENCES restaurants(id),
    business_number VARCHAR(20) NOT NULL,
    business_name VARCHAR(100),
    representative_name VARCHAR(50),
    bank_name VARCHAR(50),
    bank_account VARCHAR(50),
    bank_holder VARCHAR(50),
    verification_status VARCHAR(20) DEFAULT 'pending',
    verification_doc_url TEXT,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT merchants_user_id_unique UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_merchants_restaurant_id ON merchants(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_merchants_verification_status ON merchants(verification_status);

-- 3. menu_categories (메뉴 분류)
CREATE TABLE IF NOT EXISTS menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant_id ON menu_categories(restaurant_id);

-- 4. menus (메뉴)
CREATE TABLE IF NOT EXISTS menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    image_url TEXT,
    prep_time_min INTEGER DEFAULT 15,
    min_order_qty INTEGER DEFAULT 1,
    max_order_qty INTEGER DEFAULT 10,
    is_set_menu BOOLEAN DEFAULT false,
    serves INTEGER DEFAULT 1,
    options JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menus_restaurant_id ON menus(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menus_category_id ON menus(category_id);

-- 5. restaurant_time_slots (시간대별 예약 가능 좌석)
CREATE TABLE IF NOT EXISTS restaurant_time_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,
    slot_time TIME NOT NULL,
    max_reservations INTEGER DEFAULT 5,
    current_reservations INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT restaurant_time_slots_unique UNIQUE(restaurant_id, day_of_week, slot_time)
);

-- 6. reservations (예약)
CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    party_size INTEGER NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending_payment',
    cancel_reason TEXT,
    cancelled_by VARCHAR(20),
    qr_code VARCHAR(100) UNIQUE,
    arrival_status VARCHAR(20),
    checked_in_at TIMESTAMPTZ,
    special_request TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservations_restaurant_date ON reservations(restaurant_id, reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_user_status ON reservations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_status_date ON reservations(status, reservation_date);

-- 7. orders (주문)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES reservations(id),
    user_id UUID NOT NULL REFERENCES users(id),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id),
    total_amount INTEGER NOT NULL,
    cooking_status VARCHAR(20) DEFAULT 'pending',
    cooking_started_at TIMESTAMPTZ,
    cooking_ready_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_reservation_id ON orders(reservation_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);

-- 8. order_items (주문 항목)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_id UUID NOT NULL REFERENCES menus(id),
    menu_name VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price INTEGER NOT NULL,
    options JSONB DEFAULT '[]',
    subtotal INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- 9. payments (결제)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES reservations(id),
    order_id UUID REFERENCES orders(id),
    user_id UUID NOT NULL REFERENCES users(id),
    amount INTEGER NOT NULL,
    payment_method VARCHAR(30),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    merchant_uid VARCHAR(100) UNIQUE,
    imp_uid VARCHAR(100),
    refund_amount INTEGER DEFAULT 0,
    refund_reason TEXT,
    refund_rate INTEGER,
    paid_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_reservation_id ON payments(reservation_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_merchant_uid ON payments(merchant_uid);

-- 10. settlements (매장 정산)
CREATE TABLE IF NOT EXISTS settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id),
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_sales INTEGER NOT NULL DEFAULT 0,
    platform_fee INTEGER NOT NULL DEFAULT 0,
    settlement_amount INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settlements_restaurant_id ON settlements(restaurant_id);

-- 11. restaurant_favorites (찜)
CREATE TABLE IF NOT EXISTS restaurant_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT restaurant_favorites_unique UNIQUE(user_id, restaurant_id)
);

-- 12. restaurant_reviews (3축 리뷰)
CREATE TABLE IF NOT EXISTS restaurant_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES reservations(id),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    taste_rating INTEGER NOT NULL CHECK (taste_rating BETWEEN 1 AND 5),
    service_rating INTEGER NOT NULL CHECK (service_rating BETWEEN 1 AND 5),
    ambiance_rating INTEGER NOT NULL CHECK (ambiance_rating BETWEEN 1 AND 5),
    overall_rating NUMERIC(2,1) GENERATED ALWAYS AS (
        ROUND((taste_rating + service_rating + ambiance_rating)::NUMERIC / 3, 1)
    ) STORED,
    content TEXT,
    images JSONB DEFAULT '[]',
    reply TEXT,
    replied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT restaurant_reviews_unique UNIQUE(reservation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_restaurant_reviews_restaurant_id ON restaurant_reviews(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_reviews_user_id ON restaurant_reviews(user_id);

-- 13. user_recent_restaurant_views (최근 본 매장)
CREATE TABLE IF NOT EXISTS user_recent_restaurant_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_recent_restaurant_views_unique UNIQUE(user_id, restaurant_id)
);

CREATE INDEX IF NOT EXISTS idx_recent_restaurant_views_user ON user_recent_restaurant_views(user_id, viewed_at DESC);
