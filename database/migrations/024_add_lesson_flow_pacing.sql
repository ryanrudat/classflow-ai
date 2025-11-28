-- Migration: Add Lesson Flow Pacing Controls
-- Allows teachers to control how students progress through lesson flows

-- Add pacing mode to lesson flows
ALTER TABLE lesson_flows
ADD COLUMN IF NOT EXISTS pacing_mode VARCHAR(50) DEFAULT 'student_paced';
-- Possible values: 'student_paced', 'teacher_paced', 'teacher_guided'
-- student_paced: Students control their own pace (default, current behavior)
-- teacher_paced: Teacher controls all students - they all move together (like slides)
-- teacher_guided: Teacher sets the pace, students can catch up but not go ahead

-- Add teacher's current position for teacher-paced modes
ALTER TABLE lesson_flows
ADD COLUMN IF NOT EXISTS teacher_current_sequence INTEGER DEFAULT 1;

-- Add index for active teacher-paced flows
CREATE INDEX IF NOT EXISTS idx_lesson_flows_pacing ON lesson_flows(session_id, pacing_mode);

-- Comments
COMMENT ON COLUMN lesson_flows.pacing_mode IS 'Controls who advances the lesson flow: student_paced, teacher_paced, or teacher_guided';
COMMENT ON COLUMN lesson_flows.teacher_current_sequence IS 'Current activity position for teacher-paced modes';
