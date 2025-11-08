-- Migration: Add Lesson Flow System
-- Enables teachers to create sequential lesson experiences

-- Table for lesson flows (the container)
CREATE TABLE lesson_flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,

  -- Flow metadata
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Flow settings
  auto_advance BOOLEAN DEFAULT true, -- Auto-advance to next activity on completion
  show_progress BOOLEAN DEFAULT true, -- Show progress indicator to students
  allow_review BOOLEAN DEFAULT false, -- Allow students to go back to previous activities

  -- Status
  is_active BOOLEAN DEFAULT false, -- Is this flow currently running?

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table for lesson flow items (activities in sequence)
CREATE TABLE lesson_flow_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flow_id UUID REFERENCES lesson_flows(id) ON DELETE CASCADE NOT NULL,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE NOT NULL,

  -- Sequencing
  sequence_order INTEGER NOT NULL, -- 1, 2, 3, etc.

  -- Advancement rules
  advance_type VARCHAR(50) DEFAULT 'on_complete', -- 'on_complete', 'timer', 'manual'
  advance_delay_seconds INTEGER DEFAULT 0, -- Delay before auto-advancing (for smooth transitions)
  timer_minutes INTEGER, -- For timer-based advancement

  -- Optional settings per item
  is_required BOOLEAN DEFAULT true, -- Must complete to advance

  created_at TIMESTAMP DEFAULT NOW()
);

-- Table to track student progress through flows
CREATE TABLE lesson_flow_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flow_id UUID REFERENCES lesson_flows(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES session_students(id) ON DELETE CASCADE NOT NULL,

  -- Progress tracking
  current_item_id UUID REFERENCES lesson_flow_items(id) ON DELETE SET NULL,
  current_sequence INTEGER DEFAULT 1,
  completed_items JSONB DEFAULT '[]', -- Array of completed item IDs

  -- Status
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  is_completed BOOLEAN DEFAULT false,

  -- Constraints
  UNIQUE(flow_id, student_id)
);

-- Indexes for performance
CREATE INDEX idx_lesson_flows_session ON lesson_flows(session_id);
CREATE INDEX idx_lesson_flows_active ON lesson_flows(session_id, is_active);
CREATE INDEX idx_lesson_flow_items_flow ON lesson_flow_items(flow_id);
CREATE INDEX idx_lesson_flow_items_sequence ON lesson_flow_items(flow_id, sequence_order);
CREATE INDEX idx_lesson_flow_progress_flow ON lesson_flow_progress(flow_id);
CREATE INDEX idx_lesson_flow_progress_student ON lesson_flow_progress(student_id);
CREATE INDEX idx_lesson_flow_progress_flow_student ON lesson_flow_progress(flow_id, student_id);

-- Function to get next activity in flow for a student
CREATE OR REPLACE FUNCTION get_next_flow_activity(
  p_flow_id UUID,
  p_student_id UUID
)
RETURNS TABLE (
  activity_id UUID,
  sequence_order INTEGER,
  total_items INTEGER,
  is_last BOOLEAN
) AS $$
DECLARE
  v_current_sequence INTEGER;
  v_total_items INTEGER;
BEGIN
  -- Get student's current position in flow
  SELECT current_sequence INTO v_current_sequence
  FROM lesson_flow_progress
  WHERE flow_id = p_flow_id AND student_id = p_student_id;

  -- If no progress record, they haven't started yet - return first item
  IF v_current_sequence IS NULL THEN
    v_current_sequence := 1;
  END IF;

  -- Get total items in flow
  SELECT COUNT(*) INTO v_total_items
  FROM lesson_flow_items
  WHERE flow_id = p_flow_id;

  -- Return next activity
  RETURN QUERY
  SELECT
    lfi.activity_id,
    lfi.sequence_order,
    v_total_items::INTEGER,
    (lfi.sequence_order = v_total_items) as is_last
  FROM lesson_flow_items lfi
  WHERE lfi.flow_id = p_flow_id
    AND lfi.sequence_order = v_current_sequence
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to mark item complete and advance
CREATE OR REPLACE FUNCTION advance_flow_progress(
  p_flow_id UUID,
  p_student_id UUID,
  p_completed_item_id UUID
)
RETURNS TABLE (
  next_activity_id UUID,
  is_flow_complete BOOLEAN
) AS $$
DECLARE
  v_current_sequence INTEGER;
  v_next_sequence INTEGER;
  v_total_items INTEGER;
  v_next_item_id UUID;
  v_next_activity_id UUID;
BEGIN
  -- Get current sequence
  SELECT current_sequence INTO v_current_sequence
  FROM lesson_flow_progress
  WHERE flow_id = p_flow_id AND student_id = p_student_id;

  -- Get total items
  SELECT COUNT(*) INTO v_total_items
  FROM lesson_flow_items
  WHERE flow_id = p_flow_id;

  -- Calculate next sequence
  v_next_sequence := v_current_sequence + 1;

  -- Update progress
  IF v_next_sequence > v_total_items THEN
    -- Flow complete
    UPDATE lesson_flow_progress
    SET
      is_completed = true,
      completed_at = NOW(),
      completed_items = jsonb_build_array(p_completed_item_id)
    WHERE flow_id = p_flow_id AND student_id = p_student_id;

    RETURN QUERY SELECT NULL::UUID, true;
  ELSE
    -- Get next item
    SELECT id, activity_id INTO v_next_item_id, v_next_activity_id
    FROM lesson_flow_items
    WHERE flow_id = p_flow_id AND sequence_order = v_next_sequence
    LIMIT 1;

    -- Advance to next item
    UPDATE lesson_flow_progress
    SET
      current_sequence = v_next_sequence,
      current_item_id = v_next_item_id,
      completed_items = jsonb_build_array(p_completed_item_id)
    WHERE flow_id = p_flow_id AND student_id = p_student_id;

    RETURN QUERY SELECT v_next_activity_id, false;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE lesson_flows IS 'Sequential lesson experiences with multiple activities';
COMMENT ON TABLE lesson_flow_items IS 'Individual activities within a lesson flow';
COMMENT ON TABLE lesson_flow_progress IS 'Tracks student progress through lesson flows';
