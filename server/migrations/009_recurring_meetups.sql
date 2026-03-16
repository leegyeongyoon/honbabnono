-- Migration 009: Add recurring meetup support
-- Date: 2026-03-12

-- Add recurrence columns to meetups
ALTER TABLE meetups ADD COLUMN IF NOT EXISTS recurrence_rule VARCHAR(50) DEFAULT NULL;
ALTER TABLE meetups ADD COLUMN IF NOT EXISTS parent_meetup_id UUID REFERENCES meetups(id) ON DELETE SET NULL;
ALTER TABLE meetups ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;

-- Index for finding recurring meetups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_meetups_is_recurring ON meetups(is_recurring) WHERE is_recurring = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_meetups_parent_id ON meetups(parent_meetup_id) WHERE parent_meetup_id IS NOT NULL;
