-- Fix session instances that should be ended but are still marked as current
-- This happens when a session was ended before the fix was applied

UPDATE session_instances si
SET
  is_current = false,
  ended_at = COALESCE(si.ended_at, s.ended_at, NOW())
FROM sessions s
WHERE si.session_id = s.id
  AND s.status = 'ended'
  AND si.is_current = true;

-- Verify the fix
SELECT
  s.id as session_id,
  s.title,
  s.status as session_status,
  si.id as instance_id,
  si.instance_number,
  si.is_current,
  si.ended_at
FROM sessions s
LEFT JOIN session_instances si ON s.id = si.session_id
WHERE s.status = 'ended'
ORDER BY s.created_at DESC, si.instance_number;
