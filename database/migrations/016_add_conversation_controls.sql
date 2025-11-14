-- Add Conversation Controls to Reverse Tutoring
-- Adds max response limits, topic enforcement, and warning tracking

ALTER TABLE reverse_tutoring_conversations
ADD COLUMN IF NOT EXISTS max_student_responses INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS enforce_topic_focus BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS student_response_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS off_topic_warnings INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN reverse_tutoring_conversations.max_student_responses IS
'Maximum number of student responses allowed in this conversation. Prevents excessively long conversations.';

COMMENT ON COLUMN reverse_tutoring_conversations.enforce_topic_focus IS
'Whether to detect and warn about off-topic student messages.';

COMMENT ON COLUMN reverse_tutoring_conversations.student_response_count IS
'Number of student responses in this conversation. Used to enforce max_student_responses limit.';

COMMENT ON COLUMN reverse_tutoring_conversations.off_topic_warnings IS
'Number of off-topic warnings given to student. After 3 warnings, conversation ends.';

-- Add index for monitoring conversation length
CREATE INDEX IF NOT EXISTS idx_reverse_tutoring_response_count
ON reverse_tutoring_conversations(student_response_count);
