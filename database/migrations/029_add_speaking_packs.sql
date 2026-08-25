-- Migration: Speaking packs — pack-driven speaking attempts and turns
-- Additive only. Idempotent (IF NOT EXISTS) because the migration runner
-- marks a file as executed on any "already exists" error.
-- See docs/SPEAKING_PACKS.md

-- Which pack (id + version) a session is running
CREATE TABLE IF NOT EXISTS speaking_session_packs (
  session_id UUID PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  pack_id VARCHAR(100) NOT NULL,
  pack_version INTEGER NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW()
);

-- One attempt per student x session x pack version
CREATE TABLE IF NOT EXISTS speaking_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES session_students(id) ON DELETE CASCADE,
  pack_id VARCHAR(100) NOT NULL,
  pack_version INTEGER NOT NULL,

  state VARCHAR(30) NOT NULL DEFAULT 'PLAN',        -- PLAN | FIRST_TEACH | PROBE | REPAIR | RETEACH | DONE
  state_version INTEGER NOT NULL DEFAULT 0,          -- bumps on every transition
  turn_count INTEGER NOT NULL DEFAULT 0,

  notebook JSONB NOT NULL DEFAULT '{}',              -- { claim, because, notProved, nextEvidence }
  covered_concept_ids JSONB NOT NULL DEFAULT '[]',
  current_prompt_id VARCHAR(100),
  current_prompt_text TEXT,

  needs_teacher_review BOOLEAN NOT NULL DEFAULT false,
  closure_reason VARCHAR(50),                        -- completed | max_turns | student_end | teacher_end | session_ended

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE (session_id, student_id, pack_id, pack_version)
);

CREATE INDEX IF NOT EXISTS idx_speaking_attempts_session ON speaking_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_speaking_attempts_student ON speaking_attempts(student_id);

-- One row per student turn. Raw ASR and confirmed text are separate columns.
CREATE TABLE IF NOT EXISTS speaking_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES speaking_attempts(id) ON DELETE CASCADE,
  client_turn_id VARCHAR(100) NOT NULL,

  state_before VARCHAR(30) NOT NULL,
  state_after VARCHAR(30) NOT NULL,
  prompt_id VARCHAR(100),
  prompt_text TEXT,

  raw_asr TEXT,
  confirmed_text TEXT NOT NULL,
  transcript_edited BOOLEAN NOT NULL DEFAULT false,

  covered_concept_ids JSONB NOT NULL DEFAULT '[]',
  unresolved_concept_ids JSONB NOT NULL DEFAULT '[]',
  overclaim BOOLEAN NOT NULL DEFAULT false,
  off_topic BOOLEAN NOT NULL DEFAULT false,
  notebook_after JSONB,
  next_prompt_id VARCHAR(100),
  next_prompt_text TEXT,

  model_name VARCHAR(100),
  model_latency_ms INTEGER,
  model_fallback BOOLEAN NOT NULL DEFAULT false,
  model_error TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE (attempt_id, client_turn_id)
);

CREATE INDEX IF NOT EXISTS idx_speaking_turns_attempt ON speaking_turns(attempt_id);
