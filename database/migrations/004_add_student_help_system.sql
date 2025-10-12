-- Migration: Add Student Help System
-- This enables AI-powered instant help when students get questions wrong

-- Table to track all help events provided to students
CREATE TABLE student_help_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES session_students(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,

  -- Question context
  question_text TEXT NOT NULL,
  question_number INTEGER,
  correct_answer TEXT NOT NULL,
  student_answer TEXT NOT NULL,

  -- Help metadata
  attempt_number INTEGER NOT NULL DEFAULT 1,
  help_type VARCHAR(50) NOT NULL, -- 'gentle-nudge', 'direct-explanation', 'simpler-version'

  -- Full help object (flexible JSON)
  help_content JSONB NOT NULL,

  -- Student actions after receiving help
  student_viewed BOOLEAN DEFAULT true,
  student_tried_again BOOLEAN DEFAULT false,
  successful_after_help BOOLEAN DEFAULT NULL, -- NULL until they try again
  time_to_retry_seconds INTEGER DEFAULT NULL, -- How long until they tried again

  created_at TIMESTAMP DEFAULT NOW()
);

-- Table to track simpler version requests
CREATE TABLE simpler_version_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES session_students(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,

  -- Original and simpler versions
  original_question TEXT NOT NULL,
  simpler_question TEXT NOT NULL,

  -- Student response to simpler version
  student_response TEXT,
  successful BOOLEAN DEFAULT NULL, -- NULL until they answer

  created_at TIMESTAMP DEFAULT NOW()
);

-- Add attempt tracking to student_responses
ALTER TABLE student_responses
ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS help_received BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS help_event_id UUID REFERENCES student_help_events(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS question_number INTEGER,
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id) ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX idx_help_events_student ON student_help_events(student_id);
CREATE INDEX idx_help_events_session ON student_help_events(session_id);
CREATE INDEX idx_help_events_activity ON student_help_events(activity_id);
CREATE INDEX idx_help_events_created ON student_help_events(created_at);
CREATE INDEX idx_help_events_type ON student_help_events(help_type);

CREATE INDEX idx_simpler_requests_student ON simpler_version_requests(student_id);
CREATE INDEX idx_simpler_requests_session ON simpler_version_requests(session_id);

CREATE INDEX idx_student_responses_session ON student_responses(session_id);
CREATE INDEX idx_student_responses_attempt ON student_responses(attempt_number);
CREATE INDEX idx_student_responses_help ON student_responses(help_received) WHERE help_received = true;

-- Function to get student's recent performance for help context
CREATE OR REPLACE FUNCTION get_student_recent_performance(
  p_student_id UUID,
  p_session_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  correct_rate DECIMAL,
  avg_time_seconds DECIMAL,
  total_responses INTEGER,
  helped_count INTEGER,
  struggling BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(
      (COUNT(*) FILTER (WHERE is_correct = true))::DECIMAL /
      NULLIF(COUNT(*), 0) * 100,
      2
    ) as correct_rate,
    ROUND(AVG(time_spent_seconds), 2) as avg_time_seconds,
    COUNT(*)::INTEGER as total_responses,
    COUNT(*) FILTER (WHERE help_received = true)::INTEGER as helped_count,
    (COUNT(*) FILTER (WHERE is_correct = true))::DECIMAL /
      NULLIF(COUNT(*), 0) < 0.5 as struggling
  FROM student_responses
  WHERE student_id = p_student_id
    AND session_id = p_session_id
    AND created_at > NOW() - INTERVAL '30 minutes' -- Only recent responses
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to track help effectiveness
CREATE OR REPLACE FUNCTION update_help_effectiveness()
RETURNS TRIGGER AS $$
DECLARE
  recent_help_event UUID;
BEGIN
  -- Find most recent help event for this student/activity/question
  SELECT id INTO recent_help_event
  FROM student_help_events
  WHERE student_id = NEW.student_id
    AND activity_id = NEW.activity_id
    AND question_number = NEW.question_number
    AND created_at > NOW() - INTERVAL '30 minutes'
  ORDER BY created_at DESC
  LIMIT 1;

  -- If found, mark that student tried again and track success
  IF recent_help_event IS NOT NULL THEN
    UPDATE student_help_events
    SET
      student_tried_again = true,
      successful_after_help = NEW.is_correct,
      time_to_retry_seconds = EXTRACT(EPOCH FROM (NOW() - created_at))::INTEGER
    WHERE id = recent_help_event;

    -- Link the response to the help event
    NEW.help_event_id = recent_help_event;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically track help effectiveness
CREATE TRIGGER track_help_effectiveness
  BEFORE INSERT ON student_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_help_effectiveness();

-- Add comments
COMMENT ON TABLE student_help_events IS 'Tracks all AI help provided to students when they get questions wrong';
COMMENT ON TABLE simpler_version_requests IS 'Tracks when students request simpler versions of questions';
COMMENT ON COLUMN student_responses.attempt_number IS 'Which attempt this is for the same question (1, 2, 3...)';
COMMENT ON COLUMN student_responses.help_received IS 'Whether student received AI help before this response';
COMMENT ON COLUMN student_responses.help_event_id IS 'Links to the help event that preceded this response';
COMMENT ON COLUMN student_responses.question_number IS 'Question number within the activity (1-10)';
COMMENT ON COLUMN student_responses.session_id IS 'Session ID for faster queries (denormalized)';
