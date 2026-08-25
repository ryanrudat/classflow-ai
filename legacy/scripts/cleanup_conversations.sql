-- Clean up all test/corrupted reverse tutoring conversations
-- Run this in your database to start fresh

DELETE FROM reverse_tutoring_conversations;
DELETE FROM reverse_tutoring_topics;

-- Verify cleanup
SELECT 'Conversations remaining:' as status, COUNT(*) FROM reverse_tutoring_conversations;
SELECT 'Topics remaining:' as status, COUNT(*) FROM reverse_tutoring_topics;
