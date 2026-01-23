-- 혼밥시러 (Honbabnono) 데이터베이스 스키마
-- 생성일: 2025-10-29
-- 설명: 혼밥 모임 앱을 위한 데이터베이스 스키마

-- =====================================
-- 1. ENUM 타입 정의
-- =====================================

-- 사용자 소셜 로그인 제공자
CREATE TYPE enum_users_provider AS ENUM ('email', 'kakao', 'naver', 'google');

-- 모임 상태 타입
CREATE TYPE meetup_status AS ENUM ('모집중', '모집완료', '진행중', '완료', '취소');

-- 모임 참가자 상태 타입
CREATE TYPE participant_status AS ENUM ('대기중', '승인', '거절', '참가완료', '불참');

-- 리뷰 태그 타입 (간편한 선택지)
CREATE TYPE review_tag AS ENUM ('친절함', '시간약속 잘 지킴', '대화가 즐거웠음', '음식추천이 좋았음', '분위기가 좋았음');

-- =====================================
-- 2. 테이블 생성
-- =====================================

-- 사용자 테이블
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255), -- 소셜 로그인 시 NULL 가능
    profile_image TEXT, -- 프로필 이미지 URL
    provider enum_users_provider DEFAULT 'email',
    provider_id VARCHAR(255), -- 소셜 로그인 provider의 사용자 ID
    phone VARCHAR(255),
    is_verified BOOLEAN DEFAULT false,
    rating NUMERIC(2,1) DEFAULT 5.0, -- 평점 (1.0~5.0)
    meetups_joined INTEGER DEFAULT 0, -- 참가한 모임 수
    meetups_hosted INTEGER DEFAULT 0, -- 주최한 모임 수
    babal_score INTEGER DEFAULT 40, -- 밥알 점수 (0~100, 기본값 40점 시작)
    preferences JSONB, -- 사용자 모임 선호도 (JSON)
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 사용자 알림 설정 테이블
CREATE TABLE user_notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    push_enabled BOOLEAN DEFAULT true,
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    meetup_reminders BOOLEAN DEFAULT true,
    chat_messages BOOLEAN DEFAULT true,
    system_announcements BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 모임 테이블
CREATE TABLE meetups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    detailed_location TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    date DATE NOT NULL,
    time TIME NOT NULL,
    max_participants INTEGER NOT NULL,
    current_participants INTEGER DEFAULT 0,
    price_range VARCHAR(50),
    host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status meetup_status DEFAULT '모집중',
    image_url TEXT,
    requirements TEXT,
    cancellation_policy TEXT,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 모임 참가자 테이블
CREATE TABLE meetup_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meetup_id UUID NOT NULL REFERENCES meetups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status participant_status DEFAULT '대기중',
    message TEXT,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(meetup_id, user_id)
);

-- 채팅방 테이블
CREATE TABLE chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "meetupId" UUID NOT NULL REFERENCES meetups(id) ON DELETE CASCADE,
    "createdBy" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 채팅 메시지 테이블
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "chatRoomId" UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    "senderId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    "messageType" VARCHAR(50) DEFAULT 'text',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 채팅방 참가자 테이블
CREATE TABLE chat_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "chatRoomId" UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "joinedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "lastReadAt" TIMESTAMP WITH TIME ZONE,
    UNIQUE("chatRoomId", "userId")
);

-- 리뷰 테이블
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meetup_id UUID NOT NULL REFERENCES meetups(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    content TEXT,
    tags review_tag[],
    is_anonymous BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(meetup_id, reviewer_id, reviewee_id)
);

-- 위시리스트 테이블
CREATE TABLE wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meetup_id UUID NOT NULL REFERENCES meetups(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, meetup_id)
);

-- 알림 테이블
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    related_id UUID,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- 신고 테이블
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reported_meetup_id UUID REFERENCES meetups(id) ON DELETE CASCADE,
    reported_message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    reason VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    admin_notes TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 포인트 거래 내역 테이블
CREATE TABLE point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    description TEXT,
    related_meetup_id UUID REFERENCES meetups(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 사용자 차단 테이블
CREATE TABLE user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

-- 출석체크 테이블 (attendance_checks - 레거시 호환용)
CREATE TABLE attendance_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meetup_id UUID NOT NULL REFERENCES meetups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    check_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    location_latitude DECIMAL(10,8),
    location_longitude DECIMAL(11,8),
    verification_method VARCHAR(50) DEFAULT 'location',
    is_verified BOOLEAN DEFAULT false,
    UNIQUE(meetup_id, user_id)
);

-- 출석 테이블 (attendances - 주로 사용)
CREATE TABLE attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meetup_id UUID NOT NULL REFERENCES meetups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attendance_type VARCHAR(50) DEFAULT 'gps', -- gps, qr, host_confirm, manual
    location_latitude DECIMAL(10,8),
    location_longitude DECIMAL(11,8),
    qr_code_data TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, rejected
    confirmed_at TIMESTAMP WITH TIME ZONE,
    confirmed_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(meetup_id, user_id)
);

-- 사용자 차단 테이블 (user_blocked_users - 코드에서 사용)
CREATE TABLE user_blocked_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, blocked_user_id)
);

-- 약속금 테이블
CREATE TABLE promise_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meetup_id UUID NOT NULL REFERENCES meetups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending', -- pending, paid, refunded, forfeited
    paid_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(meetup_id, user_id)
);

-- 상호 확인 테이블 (모임 참석 상호 확인용)
CREATE TABLE mutual_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meetup_id UUID NOT NULL REFERENCES meetups(id) ON DELETE CASCADE,
    confirmer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    confirmed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- 레거시 호환
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(meetup_id, confirmer_id, confirmed_id)
);

-- 사용자 간 리뷰 테이블 (참가자 개별 평가용)
CREATE TABLE user_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meetup_id UUID NOT NULL REFERENCES meetups(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewed_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    tags TEXT[],
    is_anonymous BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(meetup_id, reviewer_id, reviewed_user_id)
);

-- =====================================
-- 3. 인덱스 생성
-- =====================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_provider ON users(provider, provider_id);
CREATE INDEX idx_meetups_host_id ON meetups(host_id);
CREATE INDEX idx_meetups_date_time ON meetups(date, time);
CREATE INDEX idx_meetups_location ON meetups(location);
CREATE INDEX idx_meetups_category ON meetups(category);
CREATE INDEX idx_meetups_status ON meetups(status);
CREATE INDEX idx_meetup_participants_meetup_id ON meetup_participants(meetup_id);
CREATE INDEX idx_meetup_participants_user_id ON meetup_participants(user_id);
CREATE INDEX idx_chat_messages_room_id ON chat_messages("chatRoomId");
CREATE INDEX idx_chat_messages_created_at ON chat_messages("createdAt");
CREATE INDEX idx_reviews_meetup_id ON reviews(meetup_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX idx_user_blocks_blocker_id ON user_blocks(blocker_id);
CREATE INDEX idx_user_blocks_blocked_id ON user_blocks(blocked_id);
CREATE INDEX idx_attendance_checks_meetup_id ON attendance_checks(meetup_id);

-- 출석(attendances) 인덱스
CREATE INDEX idx_attendances_meetup_id ON attendances(meetup_id);
CREATE INDEX idx_attendances_user_id ON attendances(user_id);
CREATE INDEX idx_attendances_status ON attendances(status);

-- 사용자 차단(user_blocked_users) 인덱스
CREATE INDEX idx_user_blocked_users_user_id ON user_blocked_users(user_id);
CREATE INDEX idx_user_blocked_users_blocked_user_id ON user_blocked_users(blocked_user_id);

-- 약속금(promise_deposits) 인덱스
CREATE INDEX idx_promise_deposits_meetup_id ON promise_deposits(meetup_id);
CREATE INDEX idx_promise_deposits_user_id ON promise_deposits(user_id);
CREATE INDEX idx_promise_deposits_status ON promise_deposits(status);

-- 상호확인(mutual_confirmations) 인덱스
CREATE INDEX idx_mutual_confirmations_meetup_id ON mutual_confirmations(meetup_id);
CREATE INDEX idx_mutual_confirmations_confirmer_id ON mutual_confirmations(confirmer_id);

-- 사용자 리뷰(user_reviews) 인덱스
CREATE INDEX idx_user_reviews_meetup_id ON user_reviews(meetup_id);
CREATE INDEX idx_user_reviews_reviewer_id ON user_reviews(reviewer_id);
CREATE INDEX idx_user_reviews_reviewed_user_id ON user_reviews(reviewed_user_id);

-- =====================================
-- 4. 트리거 함수 생성
-- =====================================

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 모임 참가자 수 업데이트 함수
CREATE OR REPLACE FUNCTION update_meetup_participants_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE meetups 
        SET current_participants = current_participants + 1 
        WHERE id = NEW.meetup_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE meetups 
        SET current_participants = current_participants - 1 
        WHERE id = OLD.meetup_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- =====================================
-- 5. 트리거 생성
-- =====================================

-- updated_at 자동 업데이트 트리거들
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_notification_settings_updated_at 
    BEFORE UPDATE ON user_notification_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetups_updated_at 
    BEFORE UPDATE ON meetups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetup_participants_updated_at 
    BEFORE UPDATE ON meetup_participants 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_rooms_updated_at 
    BEFORE UPDATE ON chat_rooms 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at 
    BEFORE UPDATE ON reviews 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 모임 참가자 수 자동 업데이트 트리거
CREATE TRIGGER update_meetup_participants_count_trigger 
    AFTER INSERT OR DELETE ON meetup_participants 
    FOR EACH ROW EXECUTE FUNCTION update_meetup_participants_count();

-- =====================================
-- 6. 기본 데이터 삽입 (선택사항)
-- =====================================

-- 관리자 사용자 생성 (비밀번호는 해시화 필요)
INSERT INTO users (id, email, name, provider, is_verified) 
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@honbabnono.com',
    '시스템 관리자',
    'email',
    true
) ON CONFLICT DO NOTHING;

COMMIT;