-- Migration: Add lesson context and critical thinking fields to reverse tutoring topics
-- Purpose: Allow teachers to provide structured lesson context for ALEX and control critical thinking depth

-- Add lesson context fields
ALTER TABLE reverse_tutoring_topics
ADD COLUMN IF NOT EXISTS concepts_covered JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS expected_explanations JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS critical_thinking_topics JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS critical_thinking_depth VARCHAR(20) DEFAULT 'none';

-- Add constraint for valid critical thinking depth values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_critical_thinking_depth'
  ) THEN
    ALTER TABLE reverse_tutoring_topics
    ADD CONSTRAINT check_critical_thinking_depth
    CHECK (critical_thinking_depth IN ('none', 'light', 'moderate'));
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN reverse_tutoring_topics.concepts_covered IS
'JSONB array of concepts students covered in class - provides context for ALEX about what students learned';

COMMENT ON COLUMN reverse_tutoring_topics.expected_explanations IS
'JSONB array of explanations ALEX should expect to hear from students who understand the topic';

COMMENT ON COLUMN reverse_tutoring_topics.critical_thinking_topics IS
'JSONB array of optional extension topics for critical thinking probes beyond the base material';

COMMENT ON COLUMN reverse_tutoring_topics.critical_thinking_depth IS
'Controls how deep ALEX probes: none (basic only), light (1 extension), moderate (2-3 Socratic questions)';

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_topics_critical_thinking_depth
ON reverse_tutoring_topics(critical_thinking_depth)
WHERE critical_thinking_depth != 'none';
