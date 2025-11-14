-- Add Language Complexity and Response Length Controls to Reverse Tutoring Topics
-- Allows teachers to customize AI behavior per topic

ALTER TABLE reverse_tutoring_topics
ADD COLUMN IF NOT EXISTS language_complexity VARCHAR(20) DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS response_length VARCHAR(20) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS max_student_responses INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS enforce_topic_focus BOOLEAN DEFAULT true;

-- Add check constraints for valid values
ALTER TABLE reverse_tutoring_topics
DROP CONSTRAINT IF EXISTS check_language_complexity;

ALTER TABLE reverse_tutoring_topics
ADD CONSTRAINT check_language_complexity
CHECK (language_complexity IN ('simple', 'standard', 'advanced'));

ALTER TABLE reverse_tutoring_topics
DROP CONSTRAINT IF EXISTS check_response_length;

ALTER TABLE reverse_tutoring_topics
ADD CONSTRAINT check_response_length
CHECK (response_length IN ('short', 'medium', 'long'));

-- Add comments for documentation
COMMENT ON COLUMN reverse_tutoring_topics.language_complexity IS
'AI language complexity: simple (elementary), standard (grade-level), advanced (sophisticated vocabulary)';

COMMENT ON COLUMN reverse_tutoring_topics.response_length IS
'AI response length: short (1-2 sentences), medium (2-3 sentences), long (3-4 sentences)';

COMMENT ON COLUMN reverse_tutoring_topics.max_student_responses IS
'Maximum number of student responses allowed for this topic';

COMMENT ON COLUMN reverse_tutoring_topics.enforce_topic_focus IS
'Whether to detect and warn about off-topic student messages for this topic';
