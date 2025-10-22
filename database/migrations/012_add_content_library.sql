-- Migration: Add Content Library
-- Allows teachers to save, organize, and reuse AI-generated activities

-- Content Library table - stores saved activities for reuse
CREATE TABLE content_library (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,

  -- Custom metadata (teacher can edit these)
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Activity content (copied from original activity)
  type VARCHAR(100) NOT NULL, -- 'reading', 'questions', 'quiz', 'discussion'
  content JSONB NOT NULL,
  difficulty_level VARCHAR(50), -- 'easy', 'medium', 'hard'

  -- Original generation info (for reference)
  original_prompt TEXT,
  subject VARCHAR(100), -- 'English', 'History', etc.
  grade_level VARCHAR(50), -- '9', '10', '11', '12', 'Mixed'

  -- Usage tracking
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,

  -- Sharing (future feature)
  is_public BOOLEAN DEFAULT false,
  shared_with_teachers UUID[], -- Array of teacher IDs

  -- Organization
  folder VARCHAR(255), -- Optional folder name for organization

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tags for categorization
CREATE TABLE library_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for UI

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(teacher_id, name) -- Prevent duplicate tag names per teacher
);

-- Many-to-many relationship: library items <-> tags
CREATE TABLE library_activity_tags (
  library_item_id UUID REFERENCES content_library(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES library_tags(id) ON DELETE CASCADE,

  PRIMARY KEY (library_item_id, tag_id)
);

-- Indexes for performance
CREATE INDEX idx_content_library_teacher ON content_library(teacher_id);
CREATE INDEX idx_content_library_type ON content_library(type);
CREATE INDEX idx_content_library_subject ON content_library(subject);
CREATE INDEX idx_content_library_times_used ON content_library(times_used DESC);
CREATE INDEX idx_library_tags_teacher ON library_tags(teacher_id);
CREATE INDEX idx_library_activity_tags_item ON library_activity_tags(library_item_id);
CREATE INDEX idx_library_activity_tags_tag ON library_activity_tags(tag_id);

-- Full-text search index for title and description
CREATE INDEX idx_content_library_search ON content_library
  USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_content_library_updated_at
  BEFORE UPDATE ON content_library
  FOR EACH ROW
  EXECUTE FUNCTION update_library_updated_at();

-- Insert some default tags for teachers (executed on first library save)
-- This will be handled in the application code when teacher creates first library item
