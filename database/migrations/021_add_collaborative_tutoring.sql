-- Migration: Add Collaborative Tutoring (Tag-Team) Support
-- Enables multiple students to work together on reverse tutoring sessions

-- ============================================
-- COLLABORATIVE TUTORING SESSIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS collaborative_tutoring_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES reverse_tutoring_conversations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,

  -- Collaboration settings
  mode VARCHAR(50) DEFAULT 'pass_the_mic',  -- 'pass_the_mic', 'build_together', 'mentor_match'
  max_participants INTEGER DEFAULT 2,

  -- Participants tracking
  participant_ids JSONB DEFAULT '[]'::jsonb,  -- Array of student IDs
  participant_names JSONB DEFAULT '{}'::jsonb,  -- { "student_id": "name" }

  -- Turn management
  current_turn_student_id UUID REFERENCES session_students(id),
  turn_order JSONB DEFAULT '[]'::jsonb,  -- Array of student IDs in turn order
  turn_count INTEGER DEFAULT 0,

  -- Contribution tracking
  contributions JSONB DEFAULT '{}'::jsonb,
  -- Format: { "student_id": { "messageCount": 0, "wordCount": 0, "analysisSum": 0 } }

  -- Balance metrics
  is_imbalanced BOOLEAN DEFAULT false,
  balance_warnings INTEGER DEFAULT 0,

  -- Status
  status VARCHAR(50) DEFAULT 'waiting',  -- 'waiting', 'active', 'completed', 'abandoned'
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Only one active collaboration per conversation
  UNIQUE(conversation_id)
);

-- Indexes for collaborative sessions
CREATE INDEX IF NOT EXISTS idx_collab_sessions_conversation ON collaborative_tutoring_sessions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_collab_sessions_session ON collaborative_tutoring_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_collab_sessions_status ON collaborative_tutoring_sessions(status);
CREATE INDEX IF NOT EXISTS idx_collab_sessions_current_turn ON collaborative_tutoring_sessions(current_turn_student_id);

-- ============================================
-- COLLABORATION INVITATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS collaboration_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collab_session_id UUID NOT NULL REFERENCES collaborative_tutoring_sessions(id) ON DELETE CASCADE,
  from_student_id UUID NOT NULL REFERENCES session_students(id) ON DELETE CASCADE,
  to_student_id UUID NOT NULL REFERENCES session_students(id) ON DELETE CASCADE,

  status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'accepted', 'declined', 'expired'
  message TEXT,  -- Optional message with invite

  created_at TIMESTAMP DEFAULT NOW(),
  responded_at TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '5 minutes'),

  UNIQUE(collab_session_id, to_student_id)
);

CREATE INDEX IF NOT EXISTS idx_collab_invites_to ON collaboration_invitations(to_student_id, status);
CREATE INDEX IF NOT EXISTS idx_collab_invites_from ON collaboration_invitations(from_student_id);
CREATE INDEX IF NOT EXISTS idx_collab_invites_session ON collaboration_invitations(collab_session_id);

-- ============================================
-- COLLABORATION WAITING ROOM TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS collaboration_waiting_room (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES reverse_tutoring_topics(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES session_students(id) ON DELETE CASCADE,
  student_name VARCHAR(255),

  status VARCHAR(50) DEFAULT 'waiting',  -- 'waiting', 'matched', 'cancelled'
  preferred_mode VARCHAR(50) DEFAULT 'pass_the_mic',

  created_at TIMESTAMP DEFAULT NOW(),
  matched_at TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '10 minutes'),

  -- One entry per student per topic
  UNIQUE(session_id, topic_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_collab_waiting_session_topic ON collaboration_waiting_room(session_id, topic_id, status);
CREATE INDEX IF NOT EXISTS idx_collab_waiting_student ON collaboration_waiting_room(student_id);

-- ============================================
-- PARTNER CHAT MESSAGES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS partner_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collab_session_id UUID NOT NULL REFERENCES collaborative_tutoring_sessions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES session_students(id) ON DELETE CASCADE,
  sender_name VARCHAR(255),

  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_chat_session ON partner_chat_messages(collab_session_id, created_at);

-- ============================================
-- UPDATE REVERSE TUTORING CONVERSATIONS
-- ============================================

-- Add collaboration flag and reference
ALTER TABLE reverse_tutoring_conversations
ADD COLUMN IF NOT EXISTS is_collaborative BOOLEAN DEFAULT false;

ALTER TABLE reverse_tutoring_conversations
ADD COLUMN IF NOT EXISTS collab_session_id UUID REFERENCES collaborative_tutoring_sessions(id) ON DELETE SET NULL;

-- Add contributor tracking to message history
-- Each message in conversation_history JSONB now includes:
-- { "role": "student", "content": "...", "contributor_id": "uuid", "contributor_name": "Sofia", ... }

CREATE INDEX IF NOT EXISTS idx_conversations_collaborative ON reverse_tutoring_conversations(is_collaborative) WHERE is_collaborative = true;

-- ============================================
-- UPDATE REVERSE TUTORING TOPICS
-- ============================================

-- Add collaboration settings to topics
ALTER TABLE reverse_tutoring_topics
ADD COLUMN IF NOT EXISTS allow_collaboration BOOLEAN DEFAULT false;

ALTER TABLE reverse_tutoring_topics
ADD COLUMN IF NOT EXISTS collaboration_mode VARCHAR(50) DEFAULT 'pass_the_mic';

ALTER TABLE reverse_tutoring_topics
ADD COLUMN IF NOT EXISTS max_collaborators INTEGER DEFAULT 2;

-- Add constraint for valid collaboration modes
ALTER TABLE reverse_tutoring_topics
DROP CONSTRAINT IF EXISTS check_collaboration_mode;

ALTER TABLE reverse_tutoring_topics
ADD CONSTRAINT check_collaboration_mode
CHECK (collaboration_mode IN ('pass_the_mic', 'build_together', 'mentor_match'));

-- ============================================
-- HELPER FUNCTION: Calculate Contribution Balance
-- ============================================

CREATE OR REPLACE FUNCTION calculate_contribution_balance(contributions JSONB)
RETURNS FLOAT AS $$
DECLARE
  total_messages INTEGER := 0;
  max_messages INTEGER := 0;
  student_messages INTEGER;
  student_id TEXT;
BEGIN
  -- Sum all message counts and find max
  FOR student_id, student_messages IN
    SELECT key, (value->>'messageCount')::INTEGER
    FROM jsonb_each(contributions)
  LOOP
    total_messages := total_messages + student_messages;
    IF student_messages > max_messages THEN
      max_messages := student_messages;
    END IF;
  END LOOP;

  -- Return balance ratio (0.5 = perfectly balanced, 1.0 = one person only)
  IF total_messages = 0 THEN
    RETURN 0.5;
  END IF;

  RETURN max_messages::FLOAT / total_messages::FLOAT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_contribution_balance IS 'Returns contribution balance ratio: 0.5 = perfect balance, 1.0 = single contributor';

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE collaborative_tutoring_sessions IS 'Tracks collaborative (tag-team) reverse tutoring sessions between multiple students';
COMMENT ON TABLE collaboration_invitations IS 'Invitations for students to join collaborative sessions';
COMMENT ON TABLE collaboration_waiting_room IS 'Students waiting for partners on specific topics';
COMMENT ON TABLE partner_chat_messages IS 'Private text chat between collaboration partners (separate from AI conversation)';

COMMENT ON COLUMN collaborative_tutoring_sessions.mode IS 'Collaboration mode: pass_the_mic (turns), build_together (simultaneous), mentor_match (advanced+beginner)';
COMMENT ON COLUMN collaborative_tutoring_sessions.contributions IS 'Tracks each participant contributions: { "uuid": { "messageCount": N, "wordCount": N } }';
COMMENT ON COLUMN collaborative_tutoring_sessions.is_imbalanced IS 'True if one participant is contributing >70% of messages';

COMMENT ON COLUMN reverse_tutoring_topics.allow_collaboration IS 'Whether this topic allows Tag-Team collaborative sessions';
COMMENT ON COLUMN reverse_tutoring_topics.collaboration_mode IS 'Default collaboration mode for this topic';
COMMENT ON COLUMN reverse_tutoring_topics.max_collaborators IS 'Maximum number of students per collaborative session (2-4)';
