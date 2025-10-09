-- ClassFlow AI - Slides System Migration
-- Adds slide decks, slides, and image library functionality

-- Create slide_decks table
CREATE TABLE slide_decks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  grade_level VARCHAR(50),
  difficulty VARCHAR(50) DEFAULT 'medium',
  total_slides INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create uploaded_images table (teacher's image library)
CREATE TABLE uploaded_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  alt_text TEXT,
  width INTEGER,
  height INTEGER,
  file_size INTEGER, -- bytes
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create slides table
CREATE TABLE slides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deck_id UUID REFERENCES slide_decks(id) ON DELETE CASCADE,
  slide_number DECIMAL(5,2) NOT NULL, -- 1, 2, 2.1 (for variants), 3...
  type VARCHAR(50) NOT NULL, -- 'title', 'content', 'question', 'discussion'

  -- Content (rich text HTML)
  title TEXT,
  body TEXT, -- HTML from rich text editor

  -- Image reference
  image_id UUID REFERENCES uploaded_images(id) ON DELETE SET NULL,
  image_position VARCHAR(20) DEFAULT 'right', -- 'left', 'center', 'right', 'background'
  image_width INTEGER DEFAULT 400,
  image_height INTEGER DEFAULT 300,

  -- Template/styling
  template VARCHAR(50) DEFAULT 'default',

  -- Differentiation
  difficulty_level VARCHAR(50) DEFAULT 'medium', -- 'easy', 'medium', 'hard'
  parent_slide_id UUID REFERENCES slides(id) ON DELETE CASCADE, -- If this is a variant

  -- Question data (if type = 'question')
  question JSONB,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Ensure unique slide numbers per deck
  UNIQUE(deck_id, slide_number)
);

-- Create student_slide_progress table
CREATE TABLE student_slide_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES session_students(id) ON DELETE CASCADE,
  slide_id UUID REFERENCES slides(id) ON DELETE CASCADE,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  time_spent_seconds INTEGER,
  stuck BOOLEAN DEFAULT false,

  -- One progress record per student per slide
  UNIQUE(student_id, slide_id)
);

-- Create indexes for performance
CREATE INDEX idx_slide_decks_session ON slide_decks(session_id);
CREATE INDEX idx_slides_deck ON slides(deck_id, slide_number);
CREATE INDEX idx_slides_parent ON slides(parent_slide_id);
CREATE INDEX idx_images_user ON uploaded_images(user_id, created_at DESC);
CREATE INDEX idx_progress_student ON student_slide_progress(student_id);
CREATE INDEX idx_progress_stuck ON student_slide_progress(stuck, completed_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_slide_decks_updated_at
  BEFORE UPDATE ON slide_decks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_slides_updated_at
  BEFORE UPDATE ON slides
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to update total_slides count
CREATE OR REPLACE FUNCTION update_total_slides_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE slide_decks
  SET total_slides = (
    SELECT COUNT(*)
    FROM slides
    WHERE deck_id = COALESCE(NEW.deck_id, OLD.deck_id)
      AND parent_slide_id IS NULL -- Only count main slides, not variants
  )
  WHERE id = COALESCE(NEW.deck_id, OLD.deck_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_deck_slide_count_insert
  AFTER INSERT ON slides
  FOR EACH ROW
  EXECUTE FUNCTION update_total_slides_count();

CREATE TRIGGER update_deck_slide_count_delete
  AFTER DELETE ON slides
  FOR EACH ROW
  EXECUTE FUNCTION update_total_slides_count();
