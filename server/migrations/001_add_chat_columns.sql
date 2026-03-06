-- Migration: 001_add_chat_columns
-- Description: chat_rooms, chat_messages 테이블에 채팅 컨트롤러가 필요로 하는 누락 컬럼 추가
-- Date: 2026-02-20

-- =====================================
-- chat_rooms 테이블 컬럼 추가
-- =====================================
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'meetup';
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS "lastMessage" TEXT;
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS "lastMessageTime" TIMESTAMP WITH TIME ZONE;

-- =====================================
-- chat_messages 테이블 컬럼 추가
-- =====================================
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS "senderName" VARCHAR(255);
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS "isEdited" BOOLEAN DEFAULT false;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS "editedAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN DEFAULT false;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS "replyToId" UUID;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS "fileUrl" TEXT;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS "fileName" VARCHAR(255);
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS "fileSize" INTEGER;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW();
