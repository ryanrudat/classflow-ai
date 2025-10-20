-- Add 'paused' status to sessions
-- Migration: 011_add_session_paused_status.sql

-- Currently sessions can only be 'active' or 'ended'
-- This adds 'paused' as a middle state where:
-- - Students can see session but can't interact
-- - Teacher can resume or end
-- - Prevents API calls during breaks

-- Add paused_at timestamp for tracking grace period
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMP;

-- Add comments for clarity
COMMENT ON COLUMN sessions.paused_at IS 'When session was paused by teacher';
COMMENT ON COLUMN sessions.grace_period_ends_at IS 'When 2-minute grace period expires after pausing/ending';

-- The status field already exists as VARCHAR, no need to change type
-- Valid values are now: 'active', 'paused', 'ended'

-- Add index for querying active/paused sessions
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
