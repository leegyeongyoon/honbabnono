-- =============================================
-- Migration 009: 리뷰 사진 첨부 + QR 체크인 토큰
-- Date: 2026-03-12
-- Description:
--   1. reviews 테이블에 images JSONB 컬럼 추가 (사진 URL 배열)
--   2. meetups 테이블에 qr_token, qr_token_expires_at 컬럼 추가 (QR 체크인용)
--   모든 구문은 IF NOT EXISTS 사용하여 여러 번 실행해도 안전(idempotent).
-- =============================================

BEGIN;

-- 1. reviews 테이블에 images 컬럼 추가
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]';

-- 2. user_reviews 테이블에 images 컬럼 추가
ALTER TABLE user_reviews ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]';

-- 3. meetups 테이블에 QR 토큰 컬럼 추가
ALTER TABLE meetups ADD COLUMN IF NOT EXISTS qr_token VARCHAR(255);
ALTER TABLE meetups ADD COLUMN IF NOT EXISTS qr_token_expires_at TIMESTAMP WITH TIME ZONE;

COMMIT;
