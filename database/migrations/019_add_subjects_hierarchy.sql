-- Migration: Add Subjects Hierarchy for Reverse Tutoring
-- Replaces simple string subject with hierarchical structure
-- Enables better standards alignment and organization

-- Create subjects table with self-referencing hierarchy
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10),  -- emoji for UI display
  parent_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  level INTEGER DEFAULT 1,  -- 1=main subject, 2=area, 3=focus
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Ensure unique names within same parent
  UNIQUE(name, parent_id)
);

-- Index for fast hierarchy lookups
CREATE INDEX IF NOT EXISTS idx_subjects_parent ON subjects(parent_id);
CREATE INDEX IF NOT EXISTS idx_subjects_level ON subjects(level);
CREATE INDEX IF NOT EXISTS idx_subjects_active ON subjects(is_active) WHERE is_active = true;

-- Add subject_id to topics table (keep old subject column for backwards compatibility)
ALTER TABLE reverse_tutoring_topics
ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL;

-- Add denormalized subject path for display
ALTER TABLE reverse_tutoring_topics
ADD COLUMN IF NOT EXISTS subject_path VARCHAR(500);

-- Index for subject lookups on topics
CREATE INDEX IF NOT EXISTS idx_reverse_tutoring_topics_subject_id ON reverse_tutoring_topics(subject_id);

-- Comments for documentation
COMMENT ON TABLE subjects IS 'Hierarchical subject structure for educational content organization';
COMMENT ON COLUMN subjects.level IS '1=Main subject (Science), 2=Area (Life Science), 3=Focus (Biology)';
COMMENT ON COLUMN subjects.parent_id IS 'Self-referencing foreign key for hierarchy';
COMMENT ON COLUMN reverse_tutoring_topics.subject_id IS 'Reference to hierarchical subject, replaces string subject column';
COMMENT ON COLUMN reverse_tutoring_topics.subject_path IS 'Denormalized display path: "Science > Life Science > Biology"';

-- ============================================
-- SEED DATA: Main Subjects (Level 1)
-- ============================================

INSERT INTO subjects (id, name, icon, parent_id, level, sort_order) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'English Language Arts', '📚', NULL, 1, 1),
  ('a1000000-0000-0000-0000-000000000002', 'Science', '🔬', NULL, 1, 2),
  ('a1000000-0000-0000-0000-000000000003', 'Mathematics', '🔢', NULL, 1, 3),
  ('a1000000-0000-0000-0000-000000000004', 'Social Studies', '🌍', NULL, 1, 4),
  ('a1000000-0000-0000-0000-000000000005', 'World Languages', '🌐', NULL, 1, 5),
  ('a1000000-0000-0000-0000-000000000006', 'Arts', '🎨', NULL, 1, 6),
  ('a1000000-0000-0000-0000-000000000007', 'Health & PE', '💪', NULL, 1, 7),
  ('a1000000-0000-0000-0000-000000000008', 'Technology & Engineering', '💻', NULL, 1, 8)
ON CONFLICT (name, parent_id) DO NOTHING;

-- ============================================
-- SEED DATA: English Language Arts (Level 2)
-- ============================================

INSERT INTO subjects (name, icon, parent_id, level, sort_order) VALUES
  ('Reading', NULL, 'a1000000-0000-0000-0000-000000000001', 2, 1),
  ('Writing', NULL, 'a1000000-0000-0000-0000-000000000001', 2, 2),
  ('Literature', NULL, 'a1000000-0000-0000-0000-000000000001', 2, 3),
  ('Grammar & Language', NULL, 'a1000000-0000-0000-0000-000000000001', 2, 4),
  ('Speaking & Listening', NULL, 'a1000000-0000-0000-0000-000000000001', 2, 5)
ON CONFLICT (name, parent_id) DO NOTHING;

-- ============================================
-- SEED DATA: Science (Level 2 & 3)
-- ============================================

-- Science Areas (Level 2)
INSERT INTO subjects (id, name, icon, parent_id, level, sort_order) VALUES
  ('a2000000-0000-0000-0000-000000000001', 'Life Science', NULL, 'a1000000-0000-0000-0000-000000000002', 2, 1),
  ('a2000000-0000-0000-0000-000000000002', 'Physical Science', NULL, 'a1000000-0000-0000-0000-000000000002', 2, 2),
  ('a2000000-0000-0000-0000-000000000003', 'Earth & Space Science', NULL, 'a1000000-0000-0000-0000-000000000002', 2, 3),
  ('a2000000-0000-0000-0000-000000000004', 'Environmental Science', NULL, 'a1000000-0000-0000-0000-000000000002', 2, 4)
ON CONFLICT (name, parent_id) DO NOTHING;

-- Life Science Focus Areas (Level 3)
INSERT INTO subjects (name, icon, parent_id, level, sort_order) VALUES
  ('Biology', NULL, 'a2000000-0000-0000-0000-000000000001', 3, 1),
  ('Ecology', NULL, 'a2000000-0000-0000-0000-000000000001', 3, 2),
  ('Anatomy & Physiology', NULL, 'a2000000-0000-0000-0000-000000000001', 3, 3),
  ('Genetics', NULL, 'a2000000-0000-0000-0000-000000000001', 3, 4)
ON CONFLICT (name, parent_id) DO NOTHING;

-- Physical Science Focus Areas (Level 3)
INSERT INTO subjects (name, icon, parent_id, level, sort_order) VALUES
  ('Chemistry', NULL, 'a2000000-0000-0000-0000-000000000002', 3, 1),
  ('Physics', NULL, 'a2000000-0000-0000-0000-000000000002', 3, 2),
  ('Matter & Energy', NULL, 'a2000000-0000-0000-0000-000000000002', 3, 3)
ON CONFLICT (name, parent_id) DO NOTHING;

-- Earth & Space Science Focus Areas (Level 3)
INSERT INTO subjects (name, icon, parent_id, level, sort_order) VALUES
  ('Geology', NULL, 'a2000000-0000-0000-0000-000000000003', 3, 1),
  ('Astronomy', NULL, 'a2000000-0000-0000-0000-000000000003', 3, 2),
  ('Meteorology', NULL, 'a2000000-0000-0000-0000-000000000003', 3, 3),
  ('Oceanography', NULL, 'a2000000-0000-0000-0000-000000000003', 3, 4)
ON CONFLICT (name, parent_id) DO NOTHING;

-- ============================================
-- SEED DATA: Mathematics (Level 2)
-- ============================================

INSERT INTO subjects (name, icon, parent_id, level, sort_order) VALUES
  ('Number & Operations', NULL, 'a1000000-0000-0000-0000-000000000003', 2, 1),
  ('Algebra', NULL, 'a1000000-0000-0000-0000-000000000003', 2, 2),
  ('Geometry', NULL, 'a1000000-0000-0000-0000-000000000003', 2, 3),
  ('Statistics & Probability', NULL, 'a1000000-0000-0000-0000-000000000003', 2, 4),
  ('Pre-Calculus', NULL, 'a1000000-0000-0000-0000-000000000003', 2, 5),
  ('Calculus', NULL, 'a1000000-0000-0000-0000-000000000003', 2, 6)
ON CONFLICT (name, parent_id) DO NOTHING;

-- ============================================
-- SEED DATA: Social Studies (Level 2 & 3)
-- ============================================

-- Social Studies Areas (Level 2)
INSERT INTO subjects (id, name, icon, parent_id, level, sort_order) VALUES
  ('a4000000-0000-0000-0000-000000000001', 'History', NULL, 'a1000000-0000-0000-0000-000000000004', 2, 1),
  ('a4000000-0000-0000-0000-000000000002', 'Geography', NULL, 'a1000000-0000-0000-0000-000000000004', 2, 2),
  ('a4000000-0000-0000-0000-000000000003', 'Civics & Government', NULL, 'a1000000-0000-0000-0000-000000000004', 2, 3),
  ('a4000000-0000-0000-0000-000000000004', 'Economics', NULL, 'a1000000-0000-0000-0000-000000000004', 2, 4)
ON CONFLICT (name, parent_id) DO NOTHING;

-- History Focus Areas (Level 3)
INSERT INTO subjects (name, icon, parent_id, level, sort_order) VALUES
  ('U.S. History', NULL, 'a4000000-0000-0000-0000-000000000001', 3, 1),
  ('World History', NULL, 'a4000000-0000-0000-0000-000000000001', 3, 2),
  ('Ancient History', NULL, 'a4000000-0000-0000-0000-000000000001', 3, 3),
  ('Modern History', NULL, 'a4000000-0000-0000-0000-000000000001', 3, 4)
ON CONFLICT (name, parent_id) DO NOTHING;

-- Geography Focus Areas (Level 3)
INSERT INTO subjects (name, icon, parent_id, level, sort_order) VALUES
  ('Physical Geography', NULL, 'a4000000-0000-0000-0000-000000000002', 3, 1),
  ('Human Geography', NULL, 'a4000000-0000-0000-0000-000000000002', 3, 2),
  ('World Regions', NULL, 'a4000000-0000-0000-0000-000000000002', 3, 3)
ON CONFLICT (name, parent_id) DO NOTHING;

-- Civics Focus Areas (Level 3)
INSERT INTO subjects (name, icon, parent_id, level, sort_order) VALUES
  ('U.S. Government', NULL, 'a4000000-0000-0000-0000-000000000003', 3, 1),
  ('Comparative Government', NULL, 'a4000000-0000-0000-0000-000000000003', 3, 2),
  ('Citizenship', NULL, 'a4000000-0000-0000-0000-000000000003', 3, 3)
ON CONFLICT (name, parent_id) DO NOTHING;

-- Economics Focus Areas (Level 3)
INSERT INTO subjects (name, icon, parent_id, level, sort_order) VALUES
  ('Microeconomics', NULL, 'a4000000-0000-0000-0000-000000000004', 3, 1),
  ('Macroeconomics', NULL, 'a4000000-0000-0000-0000-000000000004', 3, 2),
  ('Personal Finance', NULL, 'a4000000-0000-0000-0000-000000000004', 3, 3)
ON CONFLICT (name, parent_id) DO NOTHING;

-- ============================================
-- SEED DATA: World Languages (Level 2)
-- ============================================

INSERT INTO subjects (name, icon, parent_id, level, sort_order) VALUES
  ('Spanish', NULL, 'a1000000-0000-0000-0000-000000000005', 2, 1),
  ('French', NULL, 'a1000000-0000-0000-0000-000000000005', 2, 2),
  ('German', NULL, 'a1000000-0000-0000-0000-000000000005', 2, 3),
  ('Mandarin', NULL, 'a1000000-0000-0000-0000-000000000005', 2, 4),
  ('Japanese', NULL, 'a1000000-0000-0000-0000-000000000005', 2, 5),
  ('Latin', NULL, 'a1000000-0000-0000-0000-000000000005', 2, 6),
  ('Other Language', NULL, 'a1000000-0000-0000-0000-000000000005', 2, 7)
ON CONFLICT (name, parent_id) DO NOTHING;

-- ============================================
-- SEED DATA: Arts (Level 2)
-- ============================================

INSERT INTO subjects (name, icon, parent_id, level, sort_order) VALUES
  ('Visual Arts', NULL, 'a1000000-0000-0000-0000-000000000006', 2, 1),
  ('Music', NULL, 'a1000000-0000-0000-0000-000000000006', 2, 2),
  ('Theater & Drama', NULL, 'a1000000-0000-0000-0000-000000000006', 2, 3),
  ('Dance', NULL, 'a1000000-0000-0000-0000-000000000006', 2, 4),
  ('Media Arts', NULL, 'a1000000-0000-0000-0000-000000000006', 2, 5)
ON CONFLICT (name, parent_id) DO NOTHING;

-- ============================================
-- SEED DATA: Health & PE (Level 2)
-- ============================================

INSERT INTO subjects (name, icon, parent_id, level, sort_order) VALUES
  ('Health Education', NULL, 'a1000000-0000-0000-0000-000000000007', 2, 1),
  ('Nutrition', NULL, 'a1000000-0000-0000-0000-000000000007', 2, 2),
  ('Physical Education', NULL, 'a1000000-0000-0000-0000-000000000007', 2, 3),
  ('Mental Health', NULL, 'a1000000-0000-0000-0000-000000000007', 2, 4)
ON CONFLICT (name, parent_id) DO NOTHING;

-- ============================================
-- SEED DATA: Technology & Engineering (Level 2)
-- ============================================

INSERT INTO subjects (name, icon, parent_id, level, sort_order) VALUES
  ('Computer Science', NULL, 'a1000000-0000-0000-0000-000000000008', 2, 1),
  ('Engineering Design', NULL, 'a1000000-0000-0000-0000-000000000008', 2, 2),
  ('Digital Literacy', NULL, 'a1000000-0000-0000-0000-000000000008', 2, 3),
  ('Robotics', NULL, 'a1000000-0000-0000-0000-000000000008', 2, 4),
  ('Information Technology', NULL, 'a1000000-0000-0000-0000-000000000008', 2, 5)
ON CONFLICT (name, parent_id) DO NOTHING;

-- ============================================
-- HELPER FUNCTION: Get Subject Path
-- ============================================

CREATE OR REPLACE FUNCTION get_subject_path(subject_uuid UUID)
RETURNS VARCHAR(500) AS $$
DECLARE
  path_result VARCHAR(500) := '';
  current_subject RECORD;
  subject_chain UUID[] := ARRAY[]::UUID[];
BEGIN
  -- Build the chain from child to root
  WITH RECURSIVE subject_hierarchy AS (
    SELECT id, name, parent_id, 1 as depth
    FROM subjects
    WHERE id = subject_uuid

    UNION ALL

    SELECT s.id, s.name, s.parent_id, sh.depth + 1
    FROM subjects s
    INNER JOIN subject_hierarchy sh ON s.id = sh.parent_id
    WHERE sh.depth < 10  -- Safety limit
  )
  SELECT string_agg(name, ' > ' ORDER BY depth DESC)
  INTO path_result
  FROM subject_hierarchy;

  RETURN path_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_subject_path IS 'Returns the full path of a subject as "Parent > Child > Grandchild"';
