-- Migration: Add student accounts and activity completion tracking
-- This enables:
-- 1. Students to have persistent accounts across sessions
-- 2. Students to rejoin sessions and see their history
-- 3. Preventing students from retaking completed activities (academic integrity)
-- 4. Teacher controls to unlock activities for retakes

-- Create student_accounts table
CREATE TABLE student_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,

  -- Optional profile info
  grade_level VARCHAR(50), -- '6', '7', '8', 'High School', etc.

  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- Add optional link from session_students to student_accounts
-- NULL means anonymous student (backward compatible with existing behavior)
ALTER TABLE session_students
ADD COLUMN student_account_id UUID REFERENCES student_accounts(id) ON DELETE SET NULL;

-- Activity completions tracking (prevents retakes)
CREATE TABLE activity_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_account_id UUID REFERENCES student_accounts(id) ON DELETE CASCADE NOT NULL,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  instance_id UUID REFERENCES session_instances(id) ON DELETE CASCADE NOT NULL,

  -- Completion status
  status VARCHAR(50) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'locked'

  -- Performance data (denormalized for quick access)
  questions_attempted INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  score_percentage INTEGER DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,

  -- Timestamps
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  locked_at TIMESTAMP,

  -- Teacher unlock audit trail
  unlocked_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Teacher who unlocked
  unlocked_at TIMESTAMP,
  unlock_reason TEXT,

  -- Unique constraint: one completion record per student per activity per instance
  UNIQUE(student_account_id, activity_id, instance_id)
);

-- Student response audit log (track all attempts, even after activity is locked)
CREATE TABLE student_response_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_account_id UUID REFERENCES student_accounts(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES session_instances(id) ON DELETE CASCADE,

  -- What happened
  action_type VARCHAR(50) NOT NULL, -- 'started', 'answered', 'completed', 'unlocked', 'locked'
  response_data JSONB, -- Full response if applicable
  is_correct BOOLEAN,

  -- Metadata
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_student_accounts_email ON student_accounts(email);
CREATE INDEX idx_session_students_account ON session_students(student_account_id);
CREATE INDEX idx_activity_completions_student ON activity_completions(student_account_id);
CREATE INDEX idx_activity_completions_activity ON activity_completions(activity_id);
CREATE INDEX idx_activity_completions_status ON activity_completions(status);
CREATE INDEX idx_activity_completions_instance ON activity_completions(instance_id);
CREATE INDEX idx_student_response_audit_student ON student_response_audit(student_account_id);
CREATE INDEX idx_student_response_audit_activity ON student_response_audit(activity_id);
CREATE INDEX idx_student_response_audit_created ON student_response_audit(created_at);

-- Update last_login trigger for student accounts
CREATE OR REPLACE FUNCTION update_student_last_login()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_login = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- We'll call this trigger on successful login (in application code)
