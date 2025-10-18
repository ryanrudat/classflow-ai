-- Google Classroom Integration Tables
-- Stores OAuth tokens and coursework mappings

-- Table: google_classroom_tokens
-- Stores OAuth2 tokens for Google Classroom API access
CREATE TABLE IF NOT EXISTS google_classroom_tokens (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  google_user_id VARCHAR(255),
  google_email VARCHAR(255),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Table: google_classroom_coursework
-- Maps ClassFlow activities to Google Classroom coursework
CREATE TABLE IF NOT EXISTS google_classroom_coursework (
  id SERIAL PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  course_id VARCHAR(255) NOT NULL,
  coursework_id VARCHAR(255) NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(activity_id, course_id)
);

-- Add google_classroom_id column to session_students table
-- This allows us to link students who joined via Google Classroom import
ALTER TABLE session_students
ADD COLUMN IF NOT EXISTS google_classroom_id VARCHAR(255);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_session_students_google_id
ON session_students(google_classroom_id);

-- Add unique constraint to prevent duplicate imports
CREATE UNIQUE INDEX IF NOT EXISTS idx_session_students_google_unique
ON session_students(session_id, google_classroom_id)
WHERE google_classroom_id IS NOT NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_google_tokens_user_id ON google_classroom_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_google_coursework_activity_id ON google_classroom_coursework(activity_id);
CREATE INDEX IF NOT EXISTS idx_google_coursework_user_id ON google_classroom_coursework(user_id);

COMMENT ON TABLE google_classroom_tokens IS 'Stores OAuth2 tokens for Google Classroom API access';
COMMENT ON TABLE google_classroom_coursework IS 'Maps ClassFlow activities to Google Classroom coursework for grade syncing';
COMMENT ON COLUMN session_students.google_classroom_id IS 'Google Classroom user ID for students imported from Google Classroom';
