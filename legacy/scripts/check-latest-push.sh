#!/bin/bash
echo "Checking most recent activity in database..."
psql postgresql://localhost:5432/classflow_ai -c "
SELECT 
  id,
  type,
  difficulty_level,
  pushed_to,
  pushed_at,
  created_at,
  CASE 
    WHEN pushed_at IS NOT NULL THEN '✅ PUSHED'
    WHEN pushed_to = 'all' OR pushed_to = 'specific' THEN '⚠️  Should be pushed but timestamp missing'
    ELSE '❌ Not pushed yet'
  END as status
FROM activities
ORDER BY created_at DESC
LIMIT 1;
"
