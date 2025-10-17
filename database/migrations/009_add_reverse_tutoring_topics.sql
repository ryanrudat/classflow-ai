-- Reverse Tutoring Topics Configuration
-- Allows teachers to set up different topics for different students/groups

CREATE TABLE IF NOT EXISTS reverse_tutoring_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,

  -- Topic configuration
  topic VARCHAR(500) NOT NULL,
  subject VARCHAR(100) DEFAULT 'Science',
  grade_level VARCHAR(50) DEFAULT '7th grade',
  key_vocabulary JSONB DEFAULT '[]'::jsonb,

  -- Optional: assign to specific students or make available to all
  assigned_student_ids JSONB DEFAULT '[]'::jsonb, -- Empty array = available to all students

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,

  -- Allow multiple topics per session
  UNIQUE(session_id, topic)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_reverse_tutoring_topics_session ON reverse_tutoring_topics(session_id);
CREATE INDEX IF NOT EXISTS idx_reverse_tutoring_topics_active ON reverse_tutoring_topics(session_id, is_active);

-- Add a column to track which topic was used for each conversation
ALTER TABLE reverse_tutoring_conversations
ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES reverse_tutoring_topics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reverse_tutoring_conversations_topic ON reverse_tutoring_conversations(topic_id);
