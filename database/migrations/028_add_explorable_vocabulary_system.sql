-- Migration: Add Explorable Vocabulary System
-- Transforms Learning Worlds from activity-first to exploration-first model
-- Students discover vocabulary BY exploring themed lands, then activities reinforce learning

-- ============================================================================
-- NEW TABLES: Scene Items & Discovery Tracking
-- ============================================================================

-- Land Scene Items (vocabulary placed in explorable scenes)
-- Each item is a clickable/touchable element in the land's scene
CREATE TABLE land_scene_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  land_id UUID NOT NULL REFERENCES world_lands(id) ON DELETE CASCADE,
  vocabulary_id UUID NOT NULL REFERENCES world_vocabulary(id) ON DELETE CASCADE,

  -- Position in scene (percentage-based, 0-100)
  position_x DECIMAL(5,2) NOT NULL DEFAULT 50.00,
  position_y DECIMAL(5,2) NOT NULL DEFAULT 50.00,

  -- Size and layering
  scale DECIMAL(3,2) DEFAULT 1.00,
  z_index INTEGER DEFAULT 10,

  -- Visual assets (can override vocabulary defaults)
  sprite_url TEXT,                    -- The interactive sprite/image
  sprite_idle_url TEXT,               -- Optional idle state sprite
  sprite_width INTEGER,               -- Display width in pixels
  sprite_height INTEGER,              -- Display height in pixels

  -- Idle animation (what it does when not touched)
  idle_animation VARCHAR(50) DEFAULT 'none', -- 'none', 'bounce', 'sway', 'float', 'breathe', 'custom'
  idle_animation_data JSONB DEFAULT '{}',    -- Custom animation parameters

  -- Touch interaction
  touch_animation VARCHAR(50) DEFAULT 'bounce', -- 'bounce', 'grow', 'shake', 'spin', 'custom'
  touch_animation_data JSONB DEFAULT '{}',
  touch_sound_url TEXT,               -- Sound when touched (optional, defaults to word audio)
  touch_response_text TEXT,           -- "I am a LION!" or "Roar! I'm hungry!"
  touch_response_audio_url TEXT,      -- Audio for the response

  -- Discovery settings
  glow_when_undiscovered BOOLEAN DEFAULT true,  -- Subtle glow to attract attention
  glow_color VARCHAR(7) DEFAULT '#FFD700',      -- Gold glow
  discovery_points INTEGER DEFAULT 10,          -- Points earned on discovery

  -- Visibility constraints
  min_age_level INTEGER DEFAULT 1,
  max_age_level INTEGER DEFAULT 3,
  is_hidden BOOLEAN DEFAULT false,              -- Can be hidden until triggered
  unlock_after_item_id UUID REFERENCES land_scene_items(id), -- Sequential discovery

  -- Ordering (suggested discovery order)
  sequence_order INTEGER DEFAULT 1,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT chk_position_x CHECK (position_x >= 0 AND position_x <= 100),
  CONSTRAINT chk_position_y CHECK (position_y >= 0 AND position_y <= 100),
  CONSTRAINT chk_idle_animation CHECK (idle_animation IN ('none', 'bounce', 'sway', 'float', 'breathe', 'blink', 'custom')),
  CONSTRAINT chk_touch_animation CHECK (touch_animation IN ('bounce', 'grow', 'shake', 'spin', 'wiggle', 'jump', 'custom'))
);

-- Vocabulary Discovery (tracks what each student has discovered)
CREATE TABLE vocabulary_discovery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES session_students(id) ON DELETE CASCADE,
  vocabulary_id UUID NOT NULL REFERENCES world_vocabulary(id) ON DELETE CASCADE,
  scene_item_id UUID REFERENCES land_scene_items(id) ON DELETE SET NULL,
  land_id UUID NOT NULL REFERENCES world_lands(id) ON DELETE CASCADE,
  world_session_id UUID REFERENCES world_sessions(id) ON DELETE SET NULL,

  -- Discovery context
  discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  discovery_method VARCHAR(50) DEFAULT 'touch', -- 'touch', 'listen', 'teacher_intro', 'activity'

  -- Mastery tracking (spaced repetition)
  times_seen INTEGER DEFAULT 1,
  times_correct INTEGER DEFAULT 0,
  times_spoken INTEGER DEFAULT 0,        -- Speech recognition attempts
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  next_review_at TIMESTAMP WITH TIME ZONE, -- For spaced repetition
  mastery_level INTEGER DEFAULT 1 CHECK (mastery_level >= 1 AND mastery_level <= 5),

  -- Points and rewards
  points_earned INTEGER DEFAULT 0,

  UNIQUE(student_id, vocabulary_id, land_id)
);

-- ============================================================================
-- ENHANCED VOCABULARY TABLE
-- ============================================================================

-- Add new columns to world_vocabulary for richer content
ALTER TABLE world_vocabulary ADD COLUMN IF NOT EXISTS
  example_sentence TEXT;                   -- "The lion is sleeping."

ALTER TABLE world_vocabulary ADD COLUMN IF NOT EXISTS
  example_sentence_audio_url TEXT;

ALTER TABLE world_vocabulary ADD COLUMN IF NOT EXISTS
  sentence_frame TEXT;                     -- "I see a ___" or "The ___ is big"

ALTER TABLE world_vocabulary ADD COLUMN IF NOT EXISTS
  word_family TEXT[];                      -- ['lion', 'lions', 'lion\'s']

ALTER TABLE world_vocabulary ADD COLUMN IF NOT EXISTS
  related_words TEXT[];                    -- ['tiger', 'cat', 'animal']

ALTER TABLE world_vocabulary ADD COLUMN IF NOT EXISTS
  fun_fact TEXT;                           -- "Lions sleep up to 20 hours a day!"

ALTER TABLE world_vocabulary ADD COLUMN IF NOT EXISTS
  fun_fact_audio_url TEXT;

-- ============================================================================
-- ENHANCED LANDS TABLE
-- ============================================================================

-- Add scene/exploration settings to world_lands
ALTER TABLE world_lands ADD COLUMN IF NOT EXISTS
  scene_background_url TEXT;               -- Full illustrated scene background

ALTER TABLE world_lands ADD COLUMN IF NOT EXISTS
  scene_foreground_url TEXT;               -- Optional foreground layer

ALTER TABLE world_lands ADD COLUMN IF NOT EXISTS
  scene_ambient_sound_url TEXT;            -- Background audio (jungle sounds, etc.)

ALTER TABLE world_lands ADD COLUMN IF NOT EXISTS
  exploration_mode VARCHAR(50) DEFAULT 'free'; -- 'free', 'guided', 'sequential'

ALTER TABLE world_lands ADD COLUMN IF NOT EXISTS
  min_discoveries_for_activities INTEGER DEFAULT 3; -- Items to discover before activities unlock

ALTER TABLE world_lands ADD COLUMN IF NOT EXISTS
  show_discovery_progress BOOLEAN DEFAULT true;

ALTER TABLE world_lands ADD COLUMN IF NOT EXISTS
  celebration_on_all_discovered BOOLEAN DEFAULT true;

ALTER TABLE world_lands ADD COLUMN IF NOT EXISTS
  guide_hints_enabled BOOLEAN DEFAULT true;  -- Character gives hints

ALTER TABLE world_lands ADD COLUMN IF NOT EXISTS
  hint_delay_seconds INTEGER DEFAULT 10;     -- Seconds before hint appears

-- ============================================================================
-- ENHANCED ACTIVITIES TABLE
-- ============================================================================

-- Add discovery requirements to land_activities
ALTER TABLE land_activities ADD COLUMN IF NOT EXISTS
  requires_discovery_count INTEGER DEFAULT 0; -- Unlock after N discoveries

ALTER TABLE land_activities ADD COLUMN IF NOT EXISTS
  uses_discovered_vocabulary BOOLEAN DEFAULT true; -- Pull from student's discoveries

ALTER TABLE land_activities ADD COLUMN IF NOT EXISTS
  vocabulary_scope VARCHAR(50) DEFAULT 'land'; -- 'land', 'world', 'custom'

ALTER TABLE land_activities ADD COLUMN IF NOT EXISTS
  min_vocabulary_for_activity INTEGER DEFAULT 3; -- Min vocab items needed

ALTER TABLE land_activities ADD COLUMN IF NOT EXISTS
  include_undiscovered BOOLEAN DEFAULT false; -- Include items not yet discovered?

-- New activity types for exploration-based learning
ALTER TABLE land_activities DROP CONSTRAINT IF EXISTS chk_activity_type;
ALTER TABLE land_activities ADD CONSTRAINT chk_activity_type CHECK (activity_type IN (
  -- Existing types
  'vocabulary_touch', 'matching_game', 'listen_point', 'tpr_action',
  'coloring', 'story_sequence', 'fill_in_blank', 'word_spelling',
  'sentence_builder', 'reading_comprehension', 'dictation',
  'story_writing', 'dialogue_practice', 'letter_tracing', 'drawing',
  -- New exploration-based types
  'find_the_word',        -- "Touch the LION" using discovered items
  'say_it',               -- Speech recognition: "What is this?"
  'scene_hunt',           -- "Find 3 animals hiding in the scene"
  'vocabulary_story',     -- Auto-generated story using discovered words
  'speak_and_explore',    -- Say the word to make it animate
  'sentence_builder_discovered' -- Build sentences with discovered vocabulary
));

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Land Scene Items
CREATE INDEX idx_land_scene_items_land ON land_scene_items(land_id);
CREATE INDEX idx_land_scene_items_vocabulary ON land_scene_items(vocabulary_id);
CREATE INDEX idx_land_scene_items_position ON land_scene_items(land_id, position_y, position_x);
CREATE INDEX idx_land_scene_items_sequence ON land_scene_items(land_id, sequence_order);

-- Vocabulary Discovery
CREATE INDEX idx_vocabulary_discovery_student ON vocabulary_discovery(student_id);
CREATE INDEX idx_vocabulary_discovery_vocabulary ON vocabulary_discovery(vocabulary_id);
CREATE INDEX idx_vocabulary_discovery_land ON vocabulary_discovery(land_id);
CREATE INDEX idx_vocabulary_discovery_session ON vocabulary_discovery(world_session_id);
CREATE INDEX idx_vocabulary_discovery_student_land ON vocabulary_discovery(student_id, land_id);
CREATE INDEX idx_vocabulary_discovery_review ON vocabulary_discovery(student_id, next_review_at)
  WHERE next_review_at IS NOT NULL;
CREATE INDEX idx_vocabulary_discovery_mastery ON vocabulary_discovery(student_id, mastery_level);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get scene items for a land filtered by age level
CREATE OR REPLACE FUNCTION get_land_scene_items(
  p_land_id UUID,
  p_age_level INTEGER DEFAULT 2
)
RETURNS TABLE (
  id UUID,
  vocabulary_id UUID,
  word VARCHAR,
  position_x DECIMAL,
  position_y DECIMAL,
  scale DECIMAL,
  z_index INTEGER,
  sprite_url TEXT,
  idle_animation VARCHAR,
  touch_animation VARCHAR,
  glow_when_undiscovered BOOLEAN,
  sequence_order INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    lsi.id,
    lsi.vocabulary_id,
    wv.word,
    lsi.position_x,
    lsi.position_y,
    lsi.scale,
    lsi.z_index,
    COALESCE(lsi.sprite_url, wv.image_url) as sprite_url,
    lsi.idle_animation,
    lsi.touch_animation,
    lsi.glow_when_undiscovered,
    lsi.sequence_order
  FROM land_scene_items lsi
  JOIN world_vocabulary wv ON lsi.vocabulary_id = wv.id
  WHERE lsi.land_id = p_land_id
    AND lsi.min_age_level <= p_age_level
    AND lsi.max_age_level >= p_age_level
    AND lsi.is_hidden = false
  ORDER BY lsi.z_index, lsi.sequence_order;
END;
$$ LANGUAGE plpgsql;

-- Get student's discovered vocabulary for a land
CREATE OR REPLACE FUNCTION get_student_discoveries(
  p_student_id UUID,
  p_land_id UUID
)
RETURNS TABLE (
  vocabulary_id UUID,
  word VARCHAR,
  image_url TEXT,
  audio_url TEXT,
  discovered_at TIMESTAMP WITH TIME ZONE,
  times_seen INTEGER,
  mastery_level INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    wv.id as vocabulary_id,
    wv.word,
    wv.image_url,
    wv.audio_url,
    vd.discovered_at,
    vd.times_seen,
    vd.mastery_level
  FROM vocabulary_discovery vd
  JOIN world_vocabulary wv ON vd.vocabulary_id = wv.id
  WHERE vd.student_id = p_student_id
    AND vd.land_id = p_land_id
  ORDER BY vd.discovered_at;
END;
$$ LANGUAGE plpgsql;

-- Count discoveries for a student in a land
CREATE OR REPLACE FUNCTION count_student_discoveries(
  p_student_id UUID,
  p_land_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM vocabulary_discovery
  WHERE student_id = p_student_id AND land_id = p_land_id;

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Check if activities are unlocked for a student
CREATE OR REPLACE FUNCTION are_activities_unlocked(
  p_student_id UUID,
  p_land_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_discovery_count INTEGER;
  v_required_count INTEGER;
BEGIN
  -- Get required discovery count for this land
  SELECT min_discoveries_for_activities INTO v_required_count
  FROM world_lands WHERE id = p_land_id;

  -- Get student's discovery count
  v_discovery_count := count_student_discoveries(p_student_id, p_land_id);

  RETURN v_discovery_count >= COALESCE(v_required_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Record a vocabulary discovery
CREATE OR REPLACE FUNCTION record_discovery(
  p_student_id UUID,
  p_vocabulary_id UUID,
  p_land_id UUID,
  p_scene_item_id UUID DEFAULT NULL,
  p_session_id UUID DEFAULT NULL,
  p_method VARCHAR DEFAULT 'touch'
)
RETURNS vocabulary_discovery AS $$
DECLARE
  v_discovery vocabulary_discovery;
  v_points INTEGER;
BEGIN
  -- Get points from scene item if available
  SELECT discovery_points INTO v_points
  FROM land_scene_items WHERE id = p_scene_item_id;

  -- Insert or update discovery record
  INSERT INTO vocabulary_discovery (
    student_id, vocabulary_id, land_id, scene_item_id,
    world_session_id, discovery_method, points_earned
  )
  VALUES (
    p_student_id, p_vocabulary_id, p_land_id, p_scene_item_id,
    p_session_id, p_method, COALESCE(v_points, 10)
  )
  ON CONFLICT (student_id, vocabulary_id, land_id)
  DO UPDATE SET
    times_seen = vocabulary_discovery.times_seen + 1,
    last_seen_at = NOW()
  RETURNING * INTO v_discovery;

  RETURN v_discovery;
END;
$$ LANGUAGE plpgsql;

-- Update mastery level based on spaced repetition algorithm
CREATE OR REPLACE FUNCTION update_vocabulary_mastery(
  p_student_id UUID,
  p_vocabulary_id UUID,
  p_land_id UUID,
  p_correct BOOLEAN,
  p_spoken BOOLEAN DEFAULT false
)
RETURNS vocabulary_discovery AS $$
DECLARE
  v_discovery vocabulary_discovery;
  v_interval INTEGER;
BEGIN
  UPDATE vocabulary_discovery
  SET
    times_seen = times_seen + 1,
    times_correct = times_correct + CASE WHEN p_correct THEN 1 ELSE 0 END,
    times_spoken = times_spoken + CASE WHEN p_spoken THEN 1 ELSE 0 END,
    last_seen_at = NOW(),
    mastery_level = CASE
      WHEN p_correct AND mastery_level < 5 THEN mastery_level + 1
      WHEN NOT p_correct AND mastery_level > 1 THEN mastery_level - 1
      ELSE mastery_level
    END,
    -- Spaced repetition intervals: 1 day, 3 days, 7 days, 14 days, 30 days
    next_review_at = NOW() + (
      CASE mastery_level
        WHEN 1 THEN INTERVAL '1 day'
        WHEN 2 THEN INTERVAL '3 days'
        WHEN 3 THEN INTERVAL '7 days'
        WHEN 4 THEN INTERVAL '14 days'
        ELSE INTERVAL '30 days'
      END
    )
  WHERE student_id = p_student_id
    AND vocabulary_id = p_vocabulary_id
    AND land_id = p_land_id
  RETURNING * INTO v_discovery;

  RETURN v_discovery;
END;
$$ LANGUAGE plpgsql;

-- Get vocabulary due for review (spaced repetition)
CREATE OR REPLACE FUNCTION get_vocabulary_for_review(
  p_student_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  vocabulary_id UUID,
  word VARCHAR,
  image_url TEXT,
  audio_url TEXT,
  land_id UUID,
  land_name VARCHAR,
  mastery_level INTEGER,
  last_seen_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    wv.id as vocabulary_id,
    wv.word,
    wv.image_url,
    wv.audio_url,
    vd.land_id,
    wl.name as land_name,
    vd.mastery_level,
    vd.last_seen_at
  FROM vocabulary_discovery vd
  JOIN world_vocabulary wv ON vd.vocabulary_id = wv.id
  JOIN world_lands wl ON vd.land_id = wl.id
  WHERE vd.student_id = p_student_id
    AND vd.next_review_at <= NOW()
  ORDER BY vd.next_review_at, vd.mastery_level
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: Land exploration status (for teachers)
CREATE OR REPLACE VIEW land_exploration_status AS
SELECT
  wl.id as land_id,
  wl.name as land_name,
  wl.world_id,
  COUNT(DISTINCT lsi.id) as total_items,
  COUNT(DISTINCT lsi.vocabulary_id) as total_vocabulary,
  wl.min_discoveries_for_activities as required_discoveries,
  wl.exploration_mode
FROM world_lands wl
LEFT JOIN land_scene_items lsi ON lsi.land_id = wl.id AND lsi.is_hidden = false
GROUP BY wl.id, wl.name, wl.world_id, wl.min_discoveries_for_activities, wl.exploration_mode;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE land_scene_items IS 'Vocabulary items placed as interactive elements in land scenes. Students discover vocabulary by touching these items.';
COMMENT ON TABLE vocabulary_discovery IS 'Tracks which vocabulary each student has discovered, with mastery levels for spaced repetition.';

COMMENT ON COLUMN land_scene_items.idle_animation IS 'Animation when item is not being interacted with: none, bounce, sway, float, breathe, blink, custom';
COMMENT ON COLUMN land_scene_items.touch_animation IS 'Animation when item is touched: bounce, grow, shake, spin, wiggle, jump, custom';
COMMENT ON COLUMN land_scene_items.glow_when_undiscovered IS 'Shows subtle glow to attract student attention to undiscovered items';

COMMENT ON COLUMN vocabulary_discovery.mastery_level IS 'Spaced repetition mastery: 1=new, 2=learning, 3=familiar, 4=known, 5=mastered';
COMMENT ON COLUMN vocabulary_discovery.next_review_at IS 'When this vocabulary should be reviewed based on spaced repetition algorithm';

COMMENT ON COLUMN world_lands.exploration_mode IS 'free=touch anything, guided=hints shown, sequential=must discover in order';
COMMENT ON COLUMN world_lands.min_discoveries_for_activities IS 'Number of vocabulary items student must discover before activities unlock';

COMMENT ON COLUMN land_activities.uses_discovered_vocabulary IS 'When true, activity content is dynamically generated from student discoveries';
COMMENT ON COLUMN land_activities.vocabulary_scope IS 'land=only this land, world=entire world, custom=specified in content';
