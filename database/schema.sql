-- ClassFlow AI Database Schema
-- PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (teachers)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'teacher' NOT NULL,
  school VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  subject VARCHAR(100), -- 'English', 'History', 'Social Studies', 'Government', 'Biology'
  join_code VARCHAR(8) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'active', -- 'active' or 'ended'

  -- Screen control settings
  screen_lock_enabled BOOLEAN DEFAULT false,
  focus_mode_enabled BOOLEAN DEFAULT false,
  view_notification_enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP
);

-- Session students (no auth, just names)
CREATE TABLE session_students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  student_name VARCHAR(255) NOT NULL,
  device_type VARCHAR(50), -- 'chromebook', 'ipad', 'phone', 'laptop'

  -- Screen state for real-time control
  current_screen_state VARCHAR(50) DEFAULT 'free', -- 'free', 'locked', 'viewing', 'takeover'
  current_activity_id UUID,

  joined_at TIMESTAMP DEFAULT NOW(),
  last_active TIMESTAMP DEFAULT NOW()
);

-- Activities (AI-generated content)
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL, -- 'reading', 'questions', 'quiz', 'discussion', etc.

  -- AI generation metadata
  prompt TEXT NOT NULL, -- What teacher asked for
  ai_generated BOOLEAN DEFAULT true,
  generation_time_ms INTEGER, -- How long AI took to generate
  cached BOOLEAN DEFAULT false, -- Was this from cache?

  -- Content (flexible JSON structure)
  content JSONB NOT NULL,
  difficulty_level VARCHAR(50), -- 'easy', 'medium', 'hard'

  -- Targeting
  pushed_to VARCHAR(50) DEFAULT 'all', -- 'all', 'struggling', 'advanced', 'specific'
  specific_student_ids UUID[], -- Array of student IDs if pushed to specific students

  created_at TIMESTAMP DEFAULT NOW()
);

-- Student responses
CREATE TABLE student_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  student_id UUID REFERENCES session_students(id) ON DELETE CASCADE,

  -- Response data (flexible JSON)
  response JSONB NOT NULL,
  is_correct BOOLEAN,
  time_spent_seconds INTEGER,

  -- AI feedback (if applicable)
  ai_feedback TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

-- AI cache (save $$$)
CREATE TABLE ai_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_hash VARCHAR(64) UNIQUE NOT NULL, -- MD5 hash of prompt + options
  prompt TEXT NOT NULL,
  response JSONB NOT NULL,
  usage_count INTEGER DEFAULT 1,

  created_at TIMESTAMP DEFAULT NOW(),
  last_used TIMESTAMP DEFAULT NOW()
);

-- Analytics events
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(100) NOT NULL, -- 'session_created', 'ai_generated', etc.
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,

  -- Flexible event metadata
  properties JSONB,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_sessions_teacher ON sessions(teacher_id);
CREATE INDEX idx_sessions_join_code ON sessions(join_code);
CREATE INDEX idx_session_students_session ON session_students(session_id);
CREATE INDEX idx_activities_session ON activities(session_id);
CREATE INDEX idx_student_responses_activity ON student_responses(activity_id);
CREATE INDEX idx_student_responses_student ON student_responses(student_id);
CREATE INDEX idx_ai_cache_hash ON ai_cache(prompt_hash);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at);

-- Update last_active trigger for students
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_active = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_students_last_active
  BEFORE UPDATE ON session_students
  FOR EACH ROW
  EXECUTE FUNCTION update_last_active();
