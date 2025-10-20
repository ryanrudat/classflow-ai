-- Add ELL (English Language Learner) Support to Reverse Tutoring
-- Adds language proficiency level and native language tracking

ALTER TABLE reverse_tutoring_conversations
ADD COLUMN IF NOT EXISTS language_proficiency VARCHAR(20) DEFAULT 'intermediate',
ADD COLUMN IF NOT EXISTS native_language VARCHAR(50) DEFAULT 'en';

-- Add check constraint for valid proficiency levels
ALTER TABLE reverse_tutoring_conversations
ADD CONSTRAINT check_language_proficiency
CHECK (language_proficiency IN ('beginner', 'intermediate', 'advanced'));

-- Add comment for documentation
COMMENT ON COLUMN reverse_tutoring_conversations.language_proficiency IS
'English proficiency level of student: beginner, intermediate, or advanced. Used to adjust AI vocabulary and complexity.';

COMMENT ON COLUMN reverse_tutoring_conversations.native_language IS
'Student native language code (e.g., es, zh, ar). Used for bilingual scaffolding and translation support.';
