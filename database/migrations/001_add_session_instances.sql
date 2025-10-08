-- Migration: Add session instances for multi-class support
-- This allows teachers to reuse sessions across different classes/periods
-- while keeping student data and analytics separate per instance

-- Create session_instances table
CREATE TABLE session_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,

  -- Instance metadata
  instance_number INTEGER NOT NULL, -- 1st, 2nd, 3rd time using this session
  label VARCHAR(255), -- Optional: "Period 1", "Class A", etc.

  started_at TIMESTAMP DEFAULT NOW() NOT NULL,
  ended_at TIMESTAMP,

  -- Track which instance is currently active for a session
  is_current BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Add instance_id to session_students table
ALTER TABLE session_students
ADD COLUMN instance_id UUID REFERENCES session_instances(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX idx_session_instances_session ON session_instances(session_id);
CREATE INDEX idx_session_instances_current ON session_instances(session_id, is_current);
CREATE INDEX idx_session_students_instance ON session_students(instance_id);

-- Migrate existing data: create first instance for each session
INSERT INTO session_instances (session_id, instance_number, started_at, ended_at, is_current)
SELECT
  id as session_id,
  1 as instance_number,
  created_at as started_at,
  ended_at,
  CASE WHEN status = 'active' THEN true ELSE false END as is_current
FROM sessions;

-- Link existing students to their session's first instance
UPDATE session_students ss
SET instance_id = (
  SELECT si.id
  FROM session_instances si
  WHERE si.session_id = ss.session_id
  AND si.instance_number = 1
);

-- Make instance_id required after migration
ALTER TABLE session_students ALTER COLUMN instance_id SET NOT NULL;
