-- Reverse Tutoring Feature
-- Students teach an AI to demonstrate their understanding
-- AI plays confused learner, asks clarifying questions

CREATE TABLE IF NOT EXISTS reverse_tutoring_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES session_students(id) ON DELETE CASCADE,

  -- Lesson context
  topic VARCHAR(500) NOT NULL,
  subject VARCHAR(100) DEFAULT 'Science',
  grade_level VARCHAR(50) DEFAULT '7th grade',
  key_vocabulary JSONB DEFAULT '[]'::jsonb,

  -- Conversation data
  conversation_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  message_count INTEGER DEFAULT 0,

  -- Analysis metrics
  current_understanding_level INTEGER DEFAULT 0, -- 0-100
  vocabulary_used_correctly JSONB DEFAULT '[]'::jsonb,
  misconceptions_identified JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  started_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,

  -- Unique constraint: one active conversation per student per session per topic
  UNIQUE(session_id, student_id, topic)
);

-- Index for teacher dashboard queries
CREATE INDEX IF NOT EXISTS idx_reverse_tutoring_session ON reverse_tutoring_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_reverse_tutoring_student ON reverse_tutoring_conversations(student_id);
CREATE INDEX IF NOT EXISTS idx_reverse_tutoring_understanding ON reverse_tutoring_conversations(current_understanding_level);

-- Add analytics events for reverse tutoring
-- (analytics_events table already exists, just documenting event types)
-- Event types used:
--   - 'reverse_tutoring_started'
--   - 'reverse_tutoring_exchange'
--   - 'reverse_tutoring_completed'
--   - 'reverse_tutoring_help_requested'
