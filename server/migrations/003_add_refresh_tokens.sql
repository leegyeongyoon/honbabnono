-- 003: 리프레시 토큰 테이블 생성
--
-- 기존 인메모리 Map → DB 저장으로 전환
-- 서버 재시작 시에도 세션이 유지됨
--
-- 실행: psql -d honbabnono -f server/migrations/003_add_refresh_tokens.sql

CREATE TABLE IF NOT EXISTS user_refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(256) NOT NULL UNIQUE,
  email VARCHAR(255),
  name VARCHAR(100),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON user_refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON user_refresh_tokens (token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON user_refresh_tokens (expires_at);
