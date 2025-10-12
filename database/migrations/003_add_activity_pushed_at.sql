-- Migration: Add pushed_at timestamp to activities table
-- This tracks when an activity was actually pushed to students

-- Add pushed_at column to activities table (IF NOT EXISTS)
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS pushed_at TIMESTAMP DEFAULT NULL;

-- Update existing activities that have pushed_to set to 'all' or have student responses
-- to have a pushed_at timestamp (use created_at as fallback)
UPDATE activities
SET pushed_at = created_at
WHERE pushed_to IS NOT NULL
  AND pushed_to != ''
  AND (
    EXISTS (
      SELECT 1 FROM student_responses sr WHERE sr.activity_id = activities.id
    )
  );

-- Add index for faster queries filtering by pushed_at
CREATE INDEX IF NOT EXISTS idx_activities_pushed_at ON activities(pushed_at) WHERE pushed_at IS NOT NULL;

-- Add comment
COMMENT ON COLUMN activities.pushed_at IS 'Timestamp when activity was pushed to students. NULL means generated but not yet used.';
