-- Migration: Add blocked status columns to reverse_tutoring_conversations table
-- This allows teachers to block students who repeatedly go off-topic

-- Add is_blocked column (default false)
ALTER TABLE reverse_tutoring_conversations
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;

-- Add blocked_reason column
ALTER TABLE reverse_tutoring_conversations
ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

-- Add blocked_at timestamp
ALTER TABLE reverse_tutoring_conversations
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP;

-- Create index for quick lookup of blocked conversations
CREATE INDEX IF NOT EXISTS idx_reverse_tutoring_conversations_blocked
ON reverse_tutoring_conversations(is_blocked)
WHERE is_blocked = TRUE;

-- Add comment explaining the feature
COMMENT ON COLUMN reverse_tutoring_conversations.is_blocked IS
'Student is blocked from continuing this conversation due to repeated off-topic discussion. Requires teacher permission to unblock.';

COMMENT ON COLUMN reverse_tutoring_conversations.blocked_reason IS
'Reason why student was blocked (e.g., "Removed for repeatedly discussing off-topic content")';

COMMENT ON COLUMN reverse_tutoring_conversations.blocked_at IS
'Timestamp when student was blocked from this conversation';
