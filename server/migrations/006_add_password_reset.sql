-- Migration 006: Add password reset and email verification columns
-- Date: 2026-03-06

ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255);
