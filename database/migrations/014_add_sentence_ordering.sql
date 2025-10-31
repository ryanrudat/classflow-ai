-- Migration: Add Sentence Ordering Activity Support
-- Adds support for sentence ordering activities where students arrange scrambled sentences

-- Add sentence ordering as a supported activity type
-- The content JSON structure for sentence_ordering will be:
-- {
--   "sentences": [
--     {"id": "s1", "text": "First sentence", "correctPosition": 0},
--     {"id": "s2", "text": "Second sentence", "correctPosition": 1},
--     {"id": "s3", "text": "Third sentence", "correctPosition": 2}
--   ],
--   "instructions": "Put these sentences in the correct order",
--   "scoringType": "partial" | "exact"
-- }

-- Student responses for sentence ordering will be stored as:
-- {
--   "orderedSentences": ["s2", "s1", "s3"],
--   "score": 66.67,
--   "correctPositions": 2,
--   "totalSentences": 3
-- }

-- Add constraint comment for documentation
COMMENT ON COLUMN activities.type IS
'Activity type: reading, questions, quiz, mixed, discussion, interactive_video, sentence_ordering';

-- Create index for faster activity type queries
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);

-- Create leaderboard view for real-time scoring
CREATE OR REPLACE VIEW activity_leaderboard AS
SELECT
  sr.student_id,
  s.name as student_name,
  sr.session_instance_id,
  COUNT(DISTINCT sr.activity_id) as activities_completed,
  AVG(
    CASE
      -- For sentence ordering, extract score from response JSON
      WHEN a.type = 'sentence_ordering' AND sr.response::jsonb ? 'score'
      THEN (sr.response::jsonb->>'score')::numeric
      -- For quiz/questions, calculate percentage correct
      WHEN a.type IN ('quiz', 'questions', 'mixed') AND sr.response::jsonb ? 'selectedOption'
      THEN CASE WHEN sr.is_correct THEN 100 ELSE 0 END
      -- For other types, give completion credit
      ELSE 100
    END
  ) as average_score,
  SUM(
    CASE
      WHEN a.type = 'sentence_ordering' AND sr.response::jsonb ? 'score'
      THEN (sr.response::jsonb->>'score')::numeric
      WHEN a.type IN ('quiz', 'questions', 'mixed') AND sr.response::jsonb ? 'selectedOption'
      THEN CASE WHEN sr.is_correct THEN 100 ELSE 0 END
      ELSE 100
    END
  ) as total_score,
  MAX(sr.submitted_at) as last_activity_time
FROM student_responses sr
JOIN activities a ON sr.activity_id = a.id
LEFT JOIN students s ON sr.student_id = s.id
WHERE sr.submitted_at IS NOT NULL
GROUP BY sr.student_id, s.name, sr.session_instance_id
ORDER BY total_score DESC, last_activity_time DESC;

-- Create function to get leaderboard for a specific session instance
CREATE OR REPLACE FUNCTION get_session_leaderboard(p_session_instance_id UUID)
RETURNS TABLE (
  student_id UUID,
  student_name VARCHAR,
  activities_completed BIGINT,
  average_score NUMERIC,
  total_score NUMERIC,
  rank INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.student_id,
    al.student_name,
    al.activities_completed,
    ROUND(al.average_score, 2) as average_score,
    ROUND(al.total_score, 2) as total_score,
    ROW_NUMBER() OVER (ORDER BY al.total_score DESC, al.last_activity_time ASC)::INTEGER as rank
  FROM activity_leaderboard al
  WHERE al.session_instance_id = p_session_instance_id
  ORDER BY rank;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate sentence ordering score
CREATE OR REPLACE FUNCTION calculate_sentence_ordering_score(
  correct_order TEXT[],
  student_order TEXT[]
)
RETURNS NUMERIC AS $$
DECLARE
  correct_count INTEGER := 0;
  total_count INTEGER;
  i INTEGER;
BEGIN
  total_count := array_length(correct_order, 1);

  -- Count how many sentences are in correct positions
  FOR i IN 1..total_count LOOP
    IF correct_order[i] = student_order[i] THEN
      correct_count := correct_count + 1;
    END IF;
  END LOOP;

  -- Return percentage score
  RETURN (correct_count::NUMERIC / total_count::NUMERIC) * 100;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON activity_leaderboard TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_session_leaderboard(UUID) TO PUBLIC;
GRANT EXECUTE ON FUNCTION calculate_sentence_ordering_score(TEXT[], TEXT[]) TO PUBLIC;
