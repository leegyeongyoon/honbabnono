-- 107: 예약 기반 1:1 채팅 (매장 ↔ 고객)
-- v1 chat 모듈(meetup 기반, camelCase 컬럼)과 분리된 독립 테이블

CREATE TABLE IF NOT EXISTS reservation_chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    restaurant_id UUID NOT NULL REFERENCES restaurants(id),
    customer_id UUID NOT NULL REFERENCES users(id),       -- 예약자
    merchant_user_id UUID NOT NULL REFERENCES users(id),  -- 점주 user 계정
    last_message TEXT,
    last_message_at TIMESTAMPTZ,
    customer_last_read_at TIMESTAMPTZ,
    merchant_last_read_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT reservation_chat_rooms_reservation_unique UNIQUE(reservation_id)
);

CREATE INDEX IF NOT EXISTS idx_resv_chat_rooms_customer ON reservation_chat_rooms(customer_id);
CREATE INDEX IF NOT EXISTS idx_resv_chat_rooms_merchant ON reservation_chat_rooms(merchant_user_id);
CREATE INDEX IF NOT EXISTS idx_resv_chat_rooms_restaurant ON reservation_chat_rooms(restaurant_id);

CREATE TABLE IF NOT EXISTS reservation_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES reservation_chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    sender_role VARCHAR(10) NOT NULL,  -- 'customer' | 'merchant'
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resv_chat_messages_room ON reservation_chat_messages(room_id, created_at);
