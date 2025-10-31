-- Migration: Add Interactive Video Support
-- This migration adds tables for interactive video activities with timestamp-based questions

-- Table for uploaded videos
CREATE TABLE uploaded_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  duration_seconds INTEGER,  -- Video duration in seconds
  mime_type VARCHAR(100) NOT NULL,

  -- Transcription (Phase 2)
  transcript TEXT,
  transcript_generated_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_uploaded_videos_user_id ON uploaded_videos(user_id);
CREATE INDEX idx_uploaded_videos_created_at ON uploaded_videos(created_at DESC);

-- Table for video questions (embedded at specific timestamps)
CREATE TABLE video_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,

  -- Timestamp where question appears (in seconds)
  timestamp_seconds INTEGER NOT NULL,

  -- Question content
  question_type VARCHAR(50) NOT NULL, -- 'multiple_choice', 'open_ended', 'true_false'
  question_text TEXT NOT NULL,

  -- For multiple choice questions
  options JSONB,  -- Array of answer options
  correct_answer INTEGER,  -- Index of correct answer (for multiple choice)

  -- AI-generated flag (Phase 2)
  ai_generated BOOLEAN DEFAULT false,

  -- Order (multiple questions can be at same timestamp)
  question_order INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for efficient timestamp lookups
CREATE INDEX idx_video_questions_activity_id ON video_questions(activity_id);
CREATE INDEX idx_video_questions_timestamp ON video_questions(activity_id, timestamp_seconds);

-- Table for tracking student video progress
CREATE TABLE video_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  student_id UUID REFERENCES session_students(id) ON DELETE CASCADE,

  -- Current playback position
  current_timestamp_seconds INTEGER DEFAULT 0,

  -- Completion tracking
  completed BOOLEAN DEFAULT false,
  completion_percentage INTEGER DEFAULT 0,  -- 0-100

  -- Viewing stats
  total_watch_time_seconds INTEGER DEFAULT 0,
  playback_started_at TIMESTAMP,
  playback_ended_at TIMESTAMP,

  -- Last update
  last_updated TIMESTAMP DEFAULT NOW(),

  UNIQUE(activity_id, student_id)
);

-- Index for real-time monitoring
CREATE INDEX idx_video_progress_activity_student ON video_progress(activity_id, student_id);

-- Table for student answers to video questions
CREATE TABLE video_question_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID REFERENCES video_questions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES session_students(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,

  -- Response data
  response_text TEXT,  -- For open-ended
  selected_option INTEGER,  -- For multiple choice (index)
  is_correct BOOLEAN,

  -- Time spent on question
  time_spent_seconds INTEGER,

  -- AI feedback (optional, Phase 2)
  ai_feedback TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(question_id, student_id)
);

-- Index for analytics
CREATE INDEX idx_video_responses_question ON video_question_responses(question_id);
CREATE INDEX idx_video_responses_student ON video_question_responses(student_id);
CREATE INDEX idx_video_responses_activity ON video_question_responses(activity_id);

-- Add comment to activities table about interactive_video type
COMMENT ON COLUMN activities.type IS 'Activity type: reading, questions, quiz, discussion, interactive_video, etc.';

-- Grant permissions (adjust based on your user setup)
-- GRANT ALL ON uploaded_videos TO classflow_app;
-- GRANT ALL ON video_questions TO classflow_app;
-- GRANT ALL ON video_progress TO classflow_app;
-- GRANT ALL ON video_question_responses TO classflow_app;
