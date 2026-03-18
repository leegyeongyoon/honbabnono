-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO system_settings (key, value, description) VALUES
('maintenance_mode', 'false', '유지보수 모드'),
('allow_new_signups', 'true', '신규 회원가입 허용'),
('max_meetup_participants', '4', '최대 약속 참가자 수'),
('meetup_creation_cooldown', '60', '약속 생성 쿨다운(분)'),
('auto_approval_enabled', 'true', '약속 자동 승인'),
('email_notifications_enabled', 'true', '이메일 알림'),
('sms_notifications_enabled', 'false', 'SMS 알림'),
('deposit_amount', '3000', '예약금(원)'),
('platform_fee', '0', '플랫폼 수수료(원)')
ON CONFLICT (key) DO NOTHING;

-- Admin audit logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admins(id),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id UUID,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON admin_audit_logs(created_at DESC);

-- Chatbot settings table if missing
CREATE TABLE IF NOT EXISTS chatbot_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword VARCHAR(255),
  response TEXT,
  trigger_type VARCHAR(50) DEFAULT 'keyword',
  message_type VARCHAR(50) DEFAULT 'text',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to support_tickets
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS admin_response TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS resolved_by UUID;

-- Add is_hidden to reviews for soft moderation
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS hidden_reason TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS hidden_by UUID;
