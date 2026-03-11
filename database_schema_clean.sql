-- 혼밥시러 (Honbabnono / 잇테이블) 데이터베이스 스키마
-- 최종 갱신: 2026-03-11
-- 설명: 식사 모임 매칭 앱을 위한 전체 데이터베이스 스키마 (Single Source of Truth)
-- 참고: 기존 DB 에 적용하려면 server/migrations/008_schema_reconciliation.sql 사용

-- =====================================
-- 1. ENUM 타입 정의
-- =====================================

-- 사용자 소셜 로그인 제공자
CREATE TYPE enum_users_provider AS ENUM ('email', 'kakao', 'naver', 'google');

-- 모임 상태 타입
CREATE TYPE meetup_status AS ENUM ('모집중', '모집완료', '진행중', '종료', '취소');

-- 모임 참가자 상태 타입
CREATE TYPE participant_status AS ENUM ('참가신청', '참가승인', '참가거절', '참가취소');

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
    gender VARCHAR(10), -- 성별 (male, female, other)
    birth_date DATE, -- 생년월일
    babal_score NUMERIC(4,1) DEFAULT 36.5, -- 밥알지수 (0~99, 36.5 시작)
    preferences JSONB, -- 사용자 모임 선호도 (JSON)
    direct_chat_setting VARCHAR(20) DEFAULT 'ALLOW_ALL', -- 1:1 채팅 설정 (ALLOW_ALL, SAME_GENDER, BLOCKED)
    reset_token_hash VARCHAR(255), -- 비밀번호 재설정 토큰 해시
    reset_token_expires TIMESTAMP, -- 비밀번호 재설정 토큰 만료
    email_verified BOOLEAN DEFAULT false, -- 이메일 인증 완료 여부
    email_verification_token VARCHAR(255), -- 이메일 인증 토큰
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
    detailed_location TEXT, -- 레거시: 상세 위치
    address TEXT, -- 코드에서 사용하는 주소 컬럼
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    date DATE NOT NULL,
    time TIME NOT NULL,
    max_participants INTEGER NOT NULL,
    current_participants INTEGER DEFAULT 0,
    price_range VARCHAR(50),
    deposit_amount INTEGER DEFAULT 0, -- 레거시: 약속금 (0, 3000, 5000, 10000)
    promise_deposit_amount INTEGER DEFAULT 0, -- 약속금 금액
    promise_deposit_required BOOLEAN DEFAULT false, -- 약속금 필수 여부
    host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status meetup_status DEFAULT '모집중',
    image_url TEXT, -- 레거시: 이미지 URL
    image TEXT, -- 코드에서 사용하는 이미지 컬럼
    requirements TEXT,
    cancellation_policy TEXT,
    is_featured BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0, -- 조회수
    tags JSONB DEFAULT '[]', -- 모임 태그
    dining_preferences JSONB DEFAULT '{}', -- 식사 선호도
    allow_direct_chat BOOLEAN DEFAULT true, -- 1:1 채팅 허용 여부
    age_range VARCHAR(50), -- 연령대 필터
    gender_preference VARCHAR(20), -- 성별 필터
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 모임 선호 성향 필터 테이블
CREATE TABLE meetup_preference_filters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meetup_id UUID NOT NULL REFERENCES meetups(id) ON DELETE CASCADE UNIQUE,
    eating_speed VARCHAR(50) DEFAULT 'no_preference', -- 식사 속도
    conversation_during_meal VARCHAR(50) DEFAULT 'no_preference', -- 식사 중 대화
    talkativeness VARCHAR(50) DEFAULT 'no_preference', -- 말 많음 정도
    meal_purpose VARCHAR(50) DEFAULT 'no_preference', -- 식사 목적
    specific_restaurant TEXT, -- 특정 식당
    interests TEXT[], -- 관심사
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 모임 참가자 테이블
CREATE TABLE meetup_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meetup_id UUID NOT NULL REFERENCES meetups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status participant_status DEFAULT '참가신청',
    message TEXT,
    attended BOOLEAN DEFAULT false, -- 출석 여부
    attended_at TIMESTAMP WITH TIME ZONE, -- 출석 시간
    no_show BOOLEAN DEFAULT false, -- 노쇼 여부
    no_show_confirmed BOOLEAN DEFAULT false, -- 노쇼 확정 (후기에서 확인)
    progress_response TEXT, -- 진행 상황 응답
    progress_responded_at TIMESTAMP WITH TIME ZONE, -- 응답 시간
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 코드에서 INSERT 시 사용
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(meetup_id, user_id)
);

-- 채팅방 테이블
CREATE TABLE chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "meetupId" UUID NOT NULL REFERENCES meetups(id) ON DELETE CASCADE,
    "createdBy" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) DEFAULT 'meetup',
    title VARCHAR(255),
    description TEXT,
    "lastMessage" TEXT,
    "lastMessageTime" TIMESTAMP WITH TIME ZONE,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 채팅 메시지 테이블
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "chatRoomId" UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    "senderId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "senderName" VARCHAR(255),
    message TEXT NOT NULL,
    "messageType" VARCHAR(50) DEFAULT 'text',
    "isEdited" BOOLEAN DEFAULT false,
    "editedAt" TIMESTAMP WITH TIME ZONE,
    "isDeleted" BOOLEAN DEFAULT false,
    "replyToId" UUID,
    "fileUrl" TEXT,
    "fileName" VARCHAR(255),
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
    tags JSONB DEFAULT '[]',
    is_anonymous BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false, -- 추천 리뷰
    reply TEXT, -- 리뷰 답변
    reply_at TIMESTAMP WITH TIME ZONE, -- 답변 시간
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(meetup_id, reviewer_id, reviewee_id)
);

-- 위시리스트 테이블
CREATE TABLE meetup_wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meetup_id UUID NOT NULL REFERENCES meetups(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, meetup_id)
);

-- 알림 테이블
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    meetup_id UUID,
    related_user_id UUID,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    is_sent BOOLEAN DEFAULT false,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- 최근 본 모임 테이블
CREATE TABLE user_recent_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meetup_id UUID NOT NULL REFERENCES meetups(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, meetup_id)
);

-- 사용자 패널티 테이블 (노쇼 등)
CREATE TABLE user_penalties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meetup_id UUID REFERENCES meetups(id) ON DELETE SET NULL,
    penalty_type VARCHAR(50) NOT NULL, -- 'no_show', 'late_cancel', 'bad_behavior'
    penalty_amount INTEGER NOT NULL DEFAULT 0, -- 밥알 차감 점수
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
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
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
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
    amount INTEGER NOT NULL DEFAULT 0, -- 약속금 (3000, 5000, 10000)
    status VARCHAR(50) DEFAULT 'pending', -- pending, paid, refunded, partial_refunded, forfeited
    payment_method VARCHAR(50), -- 'points', 'card', 'kakaopay'
    payment_id VARCHAR(255), -- 외부 결제 ID
    refund_rate INTEGER DEFAULT 100, -- 환불율 (0-100%)
    refund_amount INTEGER DEFAULT 0, -- 실제 환불 금액
    forfeited_amount INTEGER DEFAULT 0, -- 몰수 금액
    paid_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    forfeited_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE, -- 취소 시점
    cancellation_type VARCHAR(50), -- 'voluntary', 'late_40min', 'late_20min', 'late_10min', 'noshow', 'system'
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
    reported_noshow BOOLEAN DEFAULT false, -- 노쇼 여부 신고
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(meetup_id, reviewer_id, reviewed_user_id)
);

-- =====================================
-- 밥알지수 & 위치인증 시스템 테이블
-- =====================================

-- 밥알지수 변동 이력 테이블
CREATE TABLE babal_score_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    previous_score NUMERIC(4,1) NOT NULL,
    new_score NUMERIC(4,1) NOT NULL,
    change_amount NUMERIC(4,1) NOT NULL,
    reason TEXT,
    related_meetup_id UUID REFERENCES meetups(id) ON DELETE SET NULL,
    related_review_id UUID REFERENCES reviews(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 위치 인증 기록 테이블
CREATE TABLE location_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meetup_id UUID NOT NULL REFERENCES meetups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    accuracy DECIMAL(10,2),
    distance INTEGER,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =====================================
-- 약속금 & 노쇼 시스템 테이블
-- =====================================

-- 사용자 포인트 잔액 테이블
CREATE TABLE user_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    available_points INTEGER NOT NULL DEFAULT 0, -- 사용 가능 포인트
    total_earned INTEGER NOT NULL DEFAULT 0, -- 총 적립 포인트
    total_used INTEGER NOT NULL DEFAULT 0, -- 총 사용 포인트
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 사용자 취소 이력 테이블 (잦은 취소 추적용)
CREATE TABLE user_cancellation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meetup_id UUID NOT NULL REFERENCES meetups(id) ON DELETE CASCADE,
    cancellation_type VARCHAR(50) NOT NULL, -- 'voluntary', 'late', 'noshow'
    minutes_before_meetup INTEGER, -- 모임 시작 몇 분 전 취소인지
    refund_rate INTEGER NOT NULL DEFAULT 100, -- 환불율 (0-100%)
    refund_amount INTEGER NOT NULL DEFAULT 0, -- 환불 금액
    original_deposit INTEGER NOT NULL DEFAULT 0, -- 원래 약속금
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 노쇼 배상 기록 테이블
CREATE TABLE noshow_compensations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meetup_id UUID NOT NULL REFERENCES meetups(id) ON DELETE CASCADE,
    noshow_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- 노쇼한 사람
    victim_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- 피해자
    deposit_amount INTEGER NOT NULL, -- 원래 약속금
    compensation_amount INTEGER NOT NULL, -- 배상금 (70%)
    platform_fee INTEGER NOT NULL, -- 플랫폼 수수료 (30%)
    status VARCHAR(50) DEFAULT 'pending', -- pending, paid, cancelled
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(meetup_id, noshow_user_id, victim_user_id)
);

-- 사용자 제재 테이블
CREATE TABLE user_restrictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    restriction_type VARCHAR(50) NOT NULL, -- 'cancellation_limit', 'noshow_limit', 'temporary_ban'
    reason TEXT NOT NULL,
    restriction_count INTEGER DEFAULT 0, -- 위반 횟수
    restricted_until TIMESTAMP WITH TIME ZONE, -- 제재 종료 시점 (NULL이면 영구)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 플랫폼 수익 기록 테이블
CREATE TABLE platform_revenues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meetup_id UUID REFERENCES meetups(id) ON DELETE SET NULL,
    revenue_type VARCHAR(50) NOT NULL, -- 'noshow_fee', 'late_cancel_fee', 'service_fee'
    amount INTEGER NOT NULL,
    description TEXT,
    related_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =====================================
-- 관리자 & 광고 & 뱃지 시스템 테이블
-- =====================================

-- 관리자 계정 테이블
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(50) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 뱃지 테이블
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    required_count INTEGER DEFAULT 1,
    icon VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 사용자 뱃지 테이블
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_featured BOOLEAN DEFAULT false,
    UNIQUE(user_id, badge_id)
);

-- 광고 테이블
CREATE TABLE advertisements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    link_url VARCHAR(500),
    advertiser_name VARCHAR(100), -- 레거시
    business_name VARCHAR(255), -- 코드에서 사용하는 사업체명
    contact_info VARCHAR(255), -- 연락처 정보
    use_detail_page BOOLEAN DEFAULT false, -- 상세페이지 사용 여부
    detail_content TEXT, -- 상세 컨텐츠
    status VARCHAR(20) DEFAULT 'draft',
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    click_count INTEGER DEFAULT 0,
    impression_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0, -- 조회수
    position VARCHAR(50) DEFAULT 'banner',
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 고객지원 티켓 테이블
CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'noshow_appeal', 'report', 'inquiry', 'feedback'
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_review', 'resolved', 'rejected'
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    admin_response TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 디바이스 FCM 토큰 테이블
CREATE TABLE device_tokens (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform VARCHAR(10) NOT NULL DEFAULT 'ios',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, token)
);

-- 리프레시 토큰 테이블
CREATE TABLE user_refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(256) NOT NULL UNIQUE,
    email VARCHAR(255),
    name VARCHAR(100),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- 3. 인덱스 생성
-- =====================================

-- 사용자 인덱스
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_provider ON users(provider, provider_id);
CREATE INDEX idx_users_gender ON users(gender);
CREATE INDEX idx_users_birth_date ON users(birth_date);
CREATE INDEX idx_users_direct_chat_setting ON users(direct_chat_setting);

-- 모임 인덱스
CREATE INDEX idx_meetups_host_id ON meetups(host_id);
CREATE INDEX idx_meetups_date_time ON meetups(date, time);
CREATE INDEX idx_meetups_location ON meetups(location);
CREATE INDEX idx_meetups_category ON meetups(category);
CREATE INDEX idx_meetups_status ON meetups(status);
CREATE INDEX idx_meetups_status_date ON meetups(status, date);
CREATE INDEX idx_meetups_status_date_time ON meetups(status, date, time);
CREATE INDEX idx_meetups_gender_preference ON meetups(gender_preference);
CREATE INDEX idx_meetups_promise_deposit_required ON meetups(promise_deposit_required) WHERE promise_deposit_required = true;
CREATE INDEX idx_meetups_view_count ON meetups(view_count DESC);
CREATE INDEX idx_meetups_allow_direct_chat ON meetups(allow_direct_chat);

-- 모임 참가자 인덱스
CREATE INDEX idx_meetup_participants_meetup_id ON meetup_participants(meetup_id);
CREATE INDEX idx_meetup_participants_user_id ON meetup_participants(user_id);
CREATE INDEX idx_meetup_participants_meetup_user ON meetup_participants(meetup_id, user_id);
CREATE INDEX idx_meetup_participants_no_show ON meetup_participants(user_id, no_show) WHERE no_show = true;

-- 모임 선호 필터 인덱스
CREATE INDEX idx_meetup_preference_filters_meetup_id ON meetup_preference_filters(meetup_id);

-- 채팅 인덱스
CREATE INDEX idx_chat_messages_room_id ON chat_messages("chatRoomId");
CREATE INDEX idx_chat_messages_created_at ON chat_messages("createdAt");

-- 리뷰 인덱스
CREATE INDEX idx_reviews_meetup_id ON reviews(meetup_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX idx_reviews_reviewee_id ON reviews(reviewee_id);

-- 알림 인덱스
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_meetup_id ON notifications(meetup_id) WHERE meetup_id IS NOT NULL;
CREATE INDEX idx_notifications_type_meetup_id ON notifications(type, meetup_id) WHERE meetup_id IS NOT NULL;
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_data ON notifications USING GIN (data);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- 신고 인덱스
CREATE INDEX idx_reports_status ON reports(status);

-- 포인트 인덱스
CREATE INDEX idx_point_transactions_user_id ON point_transactions(user_id);

-- 사용자 차단 인덱스
CREATE INDEX idx_user_blocks_blocker_id ON user_blocks(blocker_id);
CREATE INDEX idx_user_blocks_blocked_id ON user_blocks(blocked_id);

-- 출석체크 인덱스
CREATE INDEX idx_attendance_checks_meetup_id ON attendance_checks(meetup_id);

-- 출석 인덱스
CREATE INDEX idx_attendances_meetup_id ON attendances(meetup_id);
CREATE INDEX idx_attendances_user_id ON attendances(user_id);
CREATE INDEX idx_attendances_status ON attendances(status);

-- 사용자 차단(user_blocked_users) 인덱스
CREATE INDEX idx_user_blocked_users_user_id ON user_blocked_users(user_id);
CREATE INDEX idx_user_blocked_users_blocked_user_id ON user_blocked_users(blocked_user_id);

-- 약속금 인덱스
CREATE INDEX idx_promise_deposits_meetup_id ON promise_deposits(meetup_id);
CREATE INDEX idx_promise_deposits_user_id ON promise_deposits(user_id);
CREATE INDEX idx_promise_deposits_status ON promise_deposits(status);
CREATE INDEX idx_promise_deposits_meetup_user ON promise_deposits(meetup_id, user_id);

-- 상호확인 인덱스
CREATE INDEX idx_mutual_confirmations_meetup_id ON mutual_confirmations(meetup_id);
CREATE INDEX idx_mutual_confirmations_confirmer_id ON mutual_confirmations(confirmer_id);

-- 사용자 리뷰 인덱스
CREATE INDEX idx_user_reviews_meetup_id ON user_reviews(meetup_id);
CREATE INDEX idx_user_reviews_reviewer_id ON user_reviews(reviewer_id);
CREATE INDEX idx_user_reviews_reviewed_user_id ON user_reviews(reviewed_user_id);

-- 밥알지수 이력 인덱스
CREATE INDEX idx_babal_score_history_user_id ON babal_score_history(user_id);
CREATE INDEX idx_babal_score_history_created_at ON babal_score_history(created_at DESC);

-- 위치 인증 인덱스
CREATE INDEX idx_location_verifications_meetup_id ON location_verifications(meetup_id);
CREATE INDEX idx_location_verifications_user_id ON location_verifications(user_id);

-- 사용자 포인트 인덱스
CREATE INDEX idx_user_points_user_id ON user_points(user_id);

-- 취소 이력 인덱스
CREATE INDEX idx_user_cancellation_history_user_id ON user_cancellation_history(user_id);
CREATE INDEX idx_user_cancellation_history_meetup_id ON user_cancellation_history(meetup_id);
CREATE INDEX idx_user_cancellation_history_type ON user_cancellation_history(cancellation_type);

-- 노쇼 배상 인덱스
CREATE INDEX idx_noshow_compensations_meetup_id ON noshow_compensations(meetup_id);
CREATE INDEX idx_noshow_compensations_noshow_user_id ON noshow_compensations(noshow_user_id);
CREATE INDEX idx_noshow_compensations_victim_user_id ON noshow_compensations(victim_user_id);
CREATE INDEX idx_noshow_compensations_status ON noshow_compensations(status);

-- 사용자 제재 인덱스
CREATE INDEX idx_user_restrictions_user_id ON user_restrictions(user_id);
CREATE INDEX idx_user_restrictions_is_active ON user_restrictions(is_active);

-- 플랫폼 수익 인덱스
CREATE INDEX idx_platform_revenues_meetup_id ON platform_revenues(meetup_id);
CREATE INDEX idx_platform_revenues_type ON platform_revenues(revenue_type);

-- 관리자 인덱스
CREATE INDEX idx_admins_username ON admins(username);
CREATE INDEX idx_admins_is_active ON admins(is_active);

-- 뱃지 인덱스
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);

-- 광고 인덱스
CREATE INDEX idx_advertisements_status ON advertisements(status, is_active);
CREATE INDEX idx_advertisements_position_active ON advertisements(position, is_active) WHERE is_active = true;

-- 고객지원 인덱스
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_type ON support_tickets(type);

-- 사용자 패널티 인덱스
CREATE INDEX idx_user_penalties_user_id ON user_penalties(user_id);

-- 디바이스 토큰 인덱스
CREATE INDEX idx_device_tokens_user_id ON device_tokens(user_id);

-- 리프레시 토큰 인덱스
CREATE INDEX idx_refresh_tokens_user_id ON user_refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON user_refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires_at ON user_refresh_tokens(expires_at);

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

CREATE TRIGGER update_user_points_updated_at
    BEFORE UPDATE ON user_points
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promise_deposits_updated_at
    BEFORE UPDATE ON promise_deposits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_restrictions_updated_at
    BEFORE UPDATE ON user_restrictions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetup_preference_filters_updated_at
    BEFORE UPDATE ON meetup_preference_filters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admins_updated_at
    BEFORE UPDATE ON admins
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

-- 기본 뱃지 데이터
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

COMMIT;
