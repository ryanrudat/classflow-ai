-- Migration: Add Learning Worlds System
-- Interactive story-driven learning environments for young English learners (ages 4-10)
-- Features: themed lands, character guides, age-adaptive activities, teacher-controlled sessions

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Learning Worlds (teacher-owned world containers)
CREATE TABLE learning_worlds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- World metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  theme VARCHAR(100) DEFAULT 'fantasy', -- 'fantasy', 'nature', 'space', 'underwater'

  -- Visual settings
  map_background_url TEXT,
  map_background_color VARCHAR(7) DEFAULT '#87CEEB', -- Sky blue default

  -- Target audience
  target_age_min INTEGER DEFAULT 4 CHECK (target_age_min >= 4 AND target_age_min <= 10),
  target_age_max INTEGER DEFAULT 10 CHECK (target_age_max >= 4 AND target_age_max <= 10),

  -- Language settings
  target_language VARCHAR(10) DEFAULT 'en', -- Language being taught
  support_language VARCHAR(10) DEFAULT 'zh-TW', -- Native language for support

  -- Status
  is_published BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT chk_age_range CHECK (target_age_min <= target_age_max)
);

-- World Characters (guide characters for lands)
CREATE TABLE world_characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES learning_worlds(id) ON DELETE CASCADE,

  -- Character identity
  name VARCHAR(100) NOT NULL, -- "Leo the Lion"
  short_name VARCHAR(50), -- "Leo"
  species VARCHAR(100), -- "Lion"

  -- Personality
  personality_traits TEXT[], -- ['friendly', 'encouraging', 'playful']
  catchphrase VARCHAR(500), -- "Roooar! Let's learn together!"
  voice_style VARCHAR(100) DEFAULT 'friendly', -- For TTS

  -- Visuals
  avatar_url TEXT,
  avatar_expressions JSONB DEFAULT '{}', -- { "happy": "url", "thinking": "url", "excited": "url" }

  -- Audio
  tts_voice_id VARCHAR(100), -- OpenAI voice ID

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- World Lands (themed areas within a world)
CREATE TABLE world_lands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES learning_worlds(id) ON DELETE CASCADE,

  -- Land identity
  name VARCHAR(255) NOT NULL, -- "Animals Land"
  slug VARCHAR(100) NOT NULL, -- "animals-land"
  description TEXT,

  -- Story
  intro_story TEXT, -- Story when entering the land
  completion_story TEXT, -- Story when completing all activities

  -- Character guide for this land
  mascot_character_id UUID REFERENCES world_characters(id) ON DELETE SET NULL,

  -- Map positioning (0-100 percentage based)
  map_position_x DECIMAL(5,2) DEFAULT 50.00,
  map_position_y DECIMAL(5,2) DEFAULT 50.00,
  map_scale DECIMAL(3,2) DEFAULT 1.00, -- Size of icon on map

  -- Visuals
  icon_url TEXT,
  background_url TEXT,
  background_color VARCHAR(7),

  -- Ordering and visibility
  sequence_order INTEGER DEFAULT 1,
  is_locked BOOLEAN DEFAULT false, -- Locked until previous land completed
  unlock_after_land_id UUID REFERENCES world_lands(id) ON DELETE SET NULL,

  -- Target vocabulary for this land (quick reference)
  target_vocabulary JSONB DEFAULT '[]', -- ["dog", "cat", "elephant"]

  -- Estimated duration
  estimated_duration_minutes INTEGER DEFAULT 15,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(world_id, slug)
);

-- Land Activities (interactive activities within lands)
CREATE TABLE land_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  land_id UUID NOT NULL REFERENCES world_lands(id) ON DELETE CASCADE,

  -- Activity identity
  title VARCHAR(255) NOT NULL,
  activity_type VARCHAR(50) NOT NULL, -- 'vocabulary_touch', 'matching_game', 'listen_point', etc.

  -- Instructions
  instructions TEXT, -- Teacher instructions
  student_prompt TEXT, -- What students see/hear

  -- Narrative (spoken by character)
  intro_narrative TEXT, -- "Let's meet the animals!"
  success_narrative TEXT, -- "Great job! You know all the animals!"

  -- Content (flexible by activity type)
  content JSONB NOT NULL DEFAULT '{}',

  -- Age-level content variations
  min_age_level INTEGER DEFAULT 1 CHECK (min_age_level >= 1 AND min_age_level <= 3),
  max_age_level INTEGER DEFAULT 3 CHECK (max_age_level >= 1 AND max_age_level <= 3),
  level_1_content JSONB, -- Simplified for ages 4-6
  level_2_content JSONB, -- Medium for ages 7-8
  level_3_content JSONB, -- Advanced for ages 9-10

  -- TPR (Total Physical Response) prompts
  tpr_prompts JSONB DEFAULT '[]', -- ["Stand up!", "Touch your nose!", "Jump!"]

  -- Settings
  estimated_duration_seconds INTEGER DEFAULT 180, -- 3 minutes default
  requires_audio BOOLEAN DEFAULT true,
  allows_student_touch BOOLEAN DEFAULT true,

  -- Ordering
  sequence_order INTEGER DEFAULT 1,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT chk_activity_type CHECK (activity_type IN (
    'vocabulary_touch', 'matching_game', 'listen_point', 'tpr_action',
    'coloring', 'story_sequence', 'fill_in_blank', 'word_spelling',
    'sentence_builder', 'reading_comprehension', 'dictation',
    'story_writing', 'dialogue_practice'
  )),
  CONSTRAINT chk_age_level_range CHECK (min_age_level <= max_age_level)
);

-- World Vocabulary (reusable vocabulary items with media)
CREATE TABLE world_vocabulary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES learning_worlds(id) ON DELETE CASCADE,
  land_id UUID REFERENCES world_lands(id) ON DELETE SET NULL, -- Optional land association

  -- The word/phrase
  word VARCHAR(255) NOT NULL,
  phonetic VARCHAR(255), -- IPA pronunciation
  part_of_speech VARCHAR(50), -- noun, verb, adjective, etc.

  -- Translations
  translation_zh_tw VARCHAR(500), -- Traditional Chinese
  translation_pinyin VARCHAR(500),

  -- Level-based content
  difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level >= 1 AND difficulty_level <= 3),
  phrase_level_2 VARCHAR(500), -- "The dog is barking."
  sentence_level_3 TEXT, -- "The friendly dog barks at the mailman every morning."

  -- Media
  image_url TEXT,
  audio_url TEXT, -- Native speaker pronunciation
  audio_generated BOOLEAN DEFAULT false, -- Was audio TTS-generated?

  -- Categorization
  category VARCHAR(100), -- "animals", "colors", "food"
  tags TEXT[], -- ['pet', 'mammal', 'domestic']

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SESSION & PROGRESS TABLES
-- ============================================================================

-- World Sessions (active teaching sessions)
CREATE TABLE world_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES learning_worlds(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Link to main session system for join codes
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,

  -- Current state
  current_view VARCHAR(50) DEFAULT 'world_map', -- 'world_map', 'land_view', 'activity'
  current_land_id UUID REFERENCES world_lands(id) ON DELETE SET NULL,
  current_activity_id UUID REFERENCES land_activities(id) ON DELETE SET NULL,

  -- Control mode
  control_mode VARCHAR(20) DEFAULT 'teacher' CHECK (control_mode IN ('teacher', 'student_touch', 'hybrid')),

  -- Age level for this session
  age_level INTEGER DEFAULT 2 CHECK (age_level >= 1 AND age_level <= 3),

  -- Audio settings
  audio_enabled BOOLEAN DEFAULT true,
  music_enabled BOOLEAN DEFAULT true,
  volume_level INTEGER DEFAULT 80 CHECK (volume_level >= 0 AND volume_level <= 100),

  -- Status
  is_active BOOLEAN DEFAULT true,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,

  -- Participants tracking
  participant_count INTEGER DEFAULT 0
);

-- World Student Progress (per student, per world)
CREATE TABLE world_student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES learning_worlds(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES session_students(id) ON DELETE CASCADE,

  -- Overall progress
  total_activities_completed INTEGER DEFAULT 0,
  total_vocabulary_learned INTEGER DEFAULT 0,

  -- Land completion
  completed_land_ids UUID[] DEFAULT '{}',
  current_land_id UUID REFERENCES world_lands(id) ON DELETE SET NULL,

  -- Stars/rewards
  total_stars INTEGER DEFAULT 0,

  -- Time tracking
  total_time_seconds INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(world_id, student_id)
);

-- Land Activity Progress (per student, per activity)
CREATE TABLE land_activity_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES land_activities(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES session_students(id) ON DELETE CASCADE,
  world_session_id UUID REFERENCES world_sessions(id) ON DELETE SET NULL,

  -- Completion
  is_completed BOOLEAN DEFAULT false,
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),

  -- Scoring
  score INTEGER DEFAULT 0,
  max_score INTEGER DEFAULT 0,
  stars_earned INTEGER DEFAULT 0 CHECK (stars_earned >= 0 AND stars_earned <= 3),

  -- Attempts
  attempt_count INTEGER DEFAULT 0,

  -- Response data (flexible by activity type)
  response_data JSONB DEFAULT '{}',

  -- Timing
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  time_spent_seconds INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(activity_id, student_id, world_session_id)
);

-- ============================================================================
-- TEMPLATES TABLE
-- ============================================================================

-- Land Templates (pre-built land content)
CREATE TABLE land_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template metadata
  name VARCHAR(255) NOT NULL, -- "Animals Land"
  slug VARCHAR(100) NOT NULL UNIQUE, -- "animals-land"
  description TEXT,

  -- Target levels
  target_age_min INTEGER DEFAULT 4,
  target_age_max INTEGER DEFAULT 10,

  -- Character
  character_name VARCHAR(100), -- "Leo the Lion"
  character_avatar_url TEXT,
  character_personality TEXT,

  -- Complete land data
  land_data JSONB NOT NULL, -- Complete land structure
  activities_data JSONB NOT NULL DEFAULT '[]', -- Array of activity definitions
  vocabulary_data JSONB NOT NULL DEFAULT '[]', -- Array of vocabulary items

  -- Visual assets
  icon_url TEXT,
  background_url TEXT,
  preview_image_url TEXT,

  -- Categorization
  category VARCHAR(100), -- 'vocabulary', 'grammar', 'phonics'
  tags TEXT[],

  -- Usage tracking
  times_used INTEGER DEFAULT 0,

  -- Status
  is_official BOOLEAN DEFAULT true, -- Built-in vs user-created
  is_published BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Learning Worlds
CREATE INDEX idx_learning_worlds_teacher ON learning_worlds(teacher_id);
CREATE INDEX idx_learning_worlds_published ON learning_worlds(is_published) WHERE is_published = true;

-- World Characters
CREATE INDEX idx_world_characters_world ON world_characters(world_id);

-- World Lands
CREATE INDEX idx_world_lands_world ON world_lands(world_id);
CREATE INDEX idx_world_lands_sequence ON world_lands(world_id, sequence_order);
CREATE INDEX idx_world_lands_mascot ON world_lands(mascot_character_id);

-- Land Activities
CREATE INDEX idx_land_activities_land ON land_activities(land_id);
CREATE INDEX idx_land_activities_sequence ON land_activities(land_id, sequence_order);
CREATE INDEX idx_land_activities_type ON land_activities(activity_type);

-- World Vocabulary
CREATE INDEX idx_world_vocabulary_world ON world_vocabulary(world_id);
CREATE INDEX idx_world_vocabulary_land ON world_vocabulary(land_id);
CREATE INDEX idx_world_vocabulary_category ON world_vocabulary(category);
CREATE INDEX idx_world_vocabulary_word ON world_vocabulary(word);

-- World Sessions
CREATE INDEX idx_world_sessions_world ON world_sessions(world_id);
CREATE INDEX idx_world_sessions_teacher ON world_sessions(teacher_id);
CREATE INDEX idx_world_sessions_active ON world_sessions(is_active) WHERE is_active = true;
CREATE INDEX idx_world_sessions_session ON world_sessions(session_id);

-- Progress Tables
CREATE INDEX idx_world_student_progress_world ON world_student_progress(world_id);
CREATE INDEX idx_world_student_progress_student ON world_student_progress(student_id);
CREATE INDEX idx_land_activity_progress_activity ON land_activity_progress(activity_id);
CREATE INDEX idx_land_activity_progress_student ON land_activity_progress(student_id);
CREATE INDEX idx_land_activity_progress_session ON land_activity_progress(world_session_id);

-- Land Templates
CREATE INDEX idx_land_templates_category ON land_templates(category);
CREATE INDEX idx_land_templates_published ON land_templates(is_published) WHERE is_published = true;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get age level from age (4-6 = 1, 7-8 = 2, 9-10 = 3)
CREATE OR REPLACE FUNCTION get_age_level(age INTEGER)
RETURNS INTEGER AS $$
BEGIN
  IF age <= 6 THEN
    RETURN 1;
  ELSIF age <= 8 THEN
    RETURN 2;
  ELSE
    RETURN 3;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get activities for a land filtered by age level
CREATE OR REPLACE FUNCTION get_land_activities_for_level(
  p_land_id UUID,
  p_age_level INTEGER
)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  activity_type VARCHAR,
  content JSONB,
  sequence_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    la.id,
    la.title,
    la.activity_type,
    CASE
      WHEN p_age_level = 1 AND la.level_1_content IS NOT NULL THEN la.level_1_content
      WHEN p_age_level = 2 AND la.level_2_content IS NOT NULL THEN la.level_2_content
      WHEN p_age_level = 3 AND la.level_3_content IS NOT NULL THEN la.level_3_content
      ELSE la.content
    END as content,
    la.sequence_order
  FROM land_activities la
  WHERE la.land_id = p_land_id
    AND la.min_age_level <= p_age_level
    AND la.max_age_level >= p_age_level
  ORDER BY la.sequence_order;
END;
$$ LANGUAGE plpgsql;

-- Calculate student progress for a world
CREATE OR REPLACE FUNCTION calculate_world_progress(
  p_world_id UUID,
  p_student_id UUID
)
RETURNS TABLE (
  total_lands INTEGER,
  completed_lands INTEGER,
  total_activities INTEGER,
  completed_activities INTEGER,
  progress_percentage INTEGER
) AS $$
DECLARE
  v_total_lands INTEGER;
  v_completed_lands INTEGER;
  v_total_activities INTEGER;
  v_completed_activities INTEGER;
BEGIN
  -- Count total lands
  SELECT COUNT(*) INTO v_total_lands
  FROM world_lands WHERE world_id = p_world_id;

  -- Count completed lands
  SELECT COALESCE(array_length(completed_land_ids, 1), 0) INTO v_completed_lands
  FROM world_student_progress
  WHERE world_id = p_world_id AND student_id = p_student_id;

  IF v_completed_lands IS NULL THEN
    v_completed_lands := 0;
  END IF;

  -- Count total activities
  SELECT COUNT(*) INTO v_total_activities
  FROM land_activities la
  JOIN world_lands wl ON la.land_id = wl.id
  WHERE wl.world_id = p_world_id;

  -- Count completed activities
  SELECT COUNT(*) INTO v_completed_activities
  FROM land_activity_progress lap
  JOIN land_activities la ON lap.activity_id = la.id
  JOIN world_lands wl ON la.land_id = wl.id
  WHERE wl.world_id = p_world_id
    AND lap.student_id = p_student_id
    AND lap.is_completed = true;

  RETURN QUERY SELECT
    v_total_lands,
    v_completed_lands,
    v_total_activities,
    v_completed_activities,
    CASE
      WHEN v_total_activities = 0 THEN 0
      ELSE (v_completed_activities * 100 / v_total_activities)
    END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TABLE COMMENTS
-- ============================================================================

COMMENT ON TABLE learning_worlds IS 'Teacher-owned interactive learning world containers for young English learners';
COMMENT ON TABLE world_characters IS 'Character guides that appear in lands and provide narration';
COMMENT ON TABLE world_lands IS 'Themed areas within a world (e.g., Animals Land, Color Canyon)';
COMMENT ON TABLE land_activities IS 'Interactive activities within lands, supporting various types and age levels';
COMMENT ON TABLE world_vocabulary IS 'Vocabulary items with images, audio, and age-appropriate content variations';
COMMENT ON TABLE world_sessions IS 'Active teaching sessions linking worlds to the main session system';
COMMENT ON TABLE world_student_progress IS 'Overall student progress tracking per world';
COMMENT ON TABLE land_activity_progress IS 'Individual activity completion and scoring per student';
COMMENT ON TABLE land_templates IS 'Pre-built land content that teachers can import into their worlds';

COMMENT ON COLUMN land_activities.level_1_content IS 'Simplified content for ages 4-6: single words, large touch targets';
COMMENT ON COLUMN land_activities.level_2_content IS 'Medium content for ages 7-8: phrases and short sentences';
COMMENT ON COLUMN land_activities.level_3_content IS 'Advanced content for ages 9-10: sentences and short paragraphs';
COMMENT ON COLUMN land_activities.tpr_prompts IS 'Total Physical Response prompts for movement-based learning';

COMMENT ON COLUMN world_sessions.control_mode IS 'teacher: only teacher controls, student_touch: students can touch, hybrid: both';
COMMENT ON COLUMN world_sessions.age_level IS '1 = ages 4-6, 2 = ages 7-8, 3 = ages 9-10';
