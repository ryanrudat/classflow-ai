-- Clear AI cache to ensure new prompts take effect
-- Run this after making changes to AI generation prompts

TRUNCATE TABLE ai_cache;

-- Show confirmation
SELECT 'AI cache cleared successfully!' as message;
