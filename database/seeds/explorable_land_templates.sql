-- Seed Data: Explorable Learning World Templates (v2)
-- Run after migration 028_add_explorable_vocabulary_system.sql
-- These templates use the new exploration-first model with scene-positioned vocabulary

-- ============================================================================
-- TEMPLATE: SAFARI SAVANNA (Exploration-based Animals Land)
-- ============================================================================

INSERT INTO land_templates (
  id, name, slug, description,
  target_age_min, target_age_max,
  character_name, character_avatar_url, character_personality,
  land_data, activities_data, vocabulary_data,
  icon_url, category, tags, is_official
) VALUES (
  'e1111111-1111-1111-1111-111111111111',
  'Safari Savanna',
  'safari-savanna-explorable',
  'Explore the African savanna! Touch the animals to discover their names, then play games with the words you learned.',
  4, 8,
  'Leo the Lion',
  '/assets/characters/leo-lion.png',
  'Leo is a friendly lion who loves teaching kids about his animal friends. He gives encouraging hints when students need help.',
  -- Land data with exploration settings
  '{
    "name": "Safari Savanna",
    "theme": "animals",
    "scene_background_url": "/assets/scenes/safari-savanna-bg.jpg",
    "scene_foreground_url": "/assets/scenes/safari-savanna-fg.png",
    "scene_ambient_sound_url": "/assets/audio/ambience/savanna.mp3",
    "exploration_mode": "free",
    "min_discoveries_for_activities": 4,
    "show_discovery_progress": true,
    "celebration_on_all_discovered": true,
    "guide_hints_enabled": true,
    "hint_delay_seconds": 12
  }'::jsonb,
  -- Activities (unlock after discoveries)
  '[
    {
      "title": "Find the Animal",
      "activity_type": "find_the_word",
      "requires_discovery_count": 4,
      "uses_discovered_vocabulary": true,
      "vocabulary_scope": "land",
      "intro_narrative": "I will say an animal name. Can you touch it?",
      "success_narrative": "You found all the animals! Great listening!",
      "sequence_order": 1
    },
    {
      "title": "Say the Animal",
      "activity_type": "say_it",
      "requires_discovery_count": 4,
      "uses_discovered_vocabulary": true,
      "vocabulary_scope": "land",
      "intro_narrative": "Look at each animal and say its name!",
      "success_narrative": "Wow! You said all the animal names perfectly!",
      "sequence_order": 2
    },
    {
      "title": "Animal Match",
      "activity_type": "matching_game",
      "requires_discovery_count": 4,
      "uses_discovered_vocabulary": true,
      "vocabulary_scope": "land",
      "intro_narrative": "Connect each animal to its name!",
      "success_narrative": "Perfect matching! You really know your animals!",
      "sequence_order": 3
    },
    {
      "title": "Animal Sentences",
      "activity_type": "sentence_builder_discovered",
      "requires_discovery_count": 6,
      "uses_discovered_vocabulary": true,
      "vocabulary_scope": "land",
      "intro_narrative": "Let us build sentences about the animals!",
      "success_narrative": "Amazing sentences! You are a great writer!",
      "content": {
        "sentence_frames": [
          "I see a ___.",
          "The ___ is big.",
          "Look at the ___!"
        ]
      },
      "sequence_order": 4
    }
  ]'::jsonb,
  -- Vocabulary with scene positions
  '[
    {
      "word": "lion",
      "phonetic": "/ˈlaɪ.ən/",
      "translation_zh_tw": "獅子",
      "image_url": "/assets/vocab/animals/lion.png",
      "audio_url": "/assets/audio/words/lion.mp3",
      "example_sentence": "The lion is sleeping under the tree.",
      "sentence_frame": "I see a ___.",
      "fun_fact": "Lions can sleep up to 20 hours a day!",
      "category": "animals",
      "difficulty_level": 1,
      "scene_item": {
        "position_x": 22,
        "position_y": 68,
        "scale": 1.3,
        "z_index": 15,
        "idle_animation": "breathe",
        "touch_animation": "shake",
        "touch_response_text": "ROAR! I am a lion!",
        "glow_color": "#FFD700",
        "discovery_points": 10
      }
    },
    {
      "word": "elephant",
      "phonetic": "/ˈel.ɪ.fənt/",
      "translation_zh_tw": "大象",
      "image_url": "/assets/vocab/animals/elephant.png",
      "audio_url": "/assets/audio/words/elephant.mp3",
      "example_sentence": "The elephant sprays water with its trunk.",
      "sentence_frame": "The ___ is big.",
      "fun_fact": "Elephants never forget their friends!",
      "category": "animals",
      "difficulty_level": 1,
      "scene_item": {
        "position_x": 72,
        "position_y": 58,
        "scale": 1.5,
        "z_index": 12,
        "idle_animation": "sway",
        "touch_animation": "bounce",
        "touch_response_text": "I am an elephant! Watch me spray water!",
        "glow_color": "#87CEEB",
        "discovery_points": 10
      }
    },
    {
      "word": "giraffe",
      "phonetic": "/dʒɪˈræf/",
      "translation_zh_tw": "長頸鹿",
      "image_url": "/assets/vocab/animals/giraffe.png",
      "audio_url": "/assets/audio/words/giraffe.mp3",
      "example_sentence": "The giraffe eats leaves from tall trees.",
      "sentence_frame": "Look at the ___!",
      "fun_fact": "Giraffes are the tallest animals on Earth!",
      "category": "animals",
      "difficulty_level": 1,
      "scene_item": {
        "position_x": 88,
        "position_y": 32,
        "scale": 1.6,
        "z_index": 8,
        "idle_animation": "sway",
        "touch_animation": "bounce",
        "touch_response_text": "Hello up there! I am a giraffe!",
        "glow_color": "#FFD93D",
        "discovery_points": 10
      }
    },
    {
      "word": "zebra",
      "phonetic": "/ˈziː.brə/",
      "translation_zh_tw": "斑馬",
      "image_url": "/assets/vocab/animals/zebra.png",
      "audio_url": "/assets/audio/words/zebra.mp3",
      "example_sentence": "The zebra has black and white stripes.",
      "sentence_frame": "I see a ___.",
      "fun_fact": "Every zebra has unique stripes, like fingerprints!",
      "category": "animals",
      "difficulty_level": 1,
      "scene_item": {
        "position_x": 48,
        "position_y": 72,
        "scale": 1.1,
        "z_index": 18,
        "idle_animation": "breathe",
        "touch_animation": "wiggle",
        "touch_response_text": "I am a zebra! Look at my stripes!",
        "glow_color": "#FFFFFF",
        "discovery_points": 10
      }
    },
    {
      "word": "monkey",
      "phonetic": "/ˈmʌŋ.ki/",
      "translation_zh_tw": "猴子",
      "image_url": "/assets/vocab/animals/monkey.png",
      "audio_url": "/assets/audio/words/monkey.mp3",
      "example_sentence": "The monkey swings in the trees.",
      "sentence_frame": "The ___ is funny.",
      "fun_fact": "Monkeys use their tails like an extra hand!",
      "category": "animals",
      "difficulty_level": 1,
      "scene_item": {
        "position_x": 12,
        "position_y": 28,
        "scale": 0.9,
        "z_index": 20,
        "idle_animation": "bounce",
        "touch_animation": "jump",
        "touch_response_text": "Ooh ooh! I am a monkey!",
        "glow_color": "#D2691E",
        "discovery_points": 10
      }
    },
    {
      "word": "hippo",
      "phonetic": "/ˈhɪp.oʊ/",
      "translation_zh_tw": "河馬",
      "image_url": "/assets/vocab/animals/hippo.png",
      "audio_url": "/assets/audio/words/hippo.mp3",
      "example_sentence": "The hippo swims in the river.",
      "sentence_frame": "The ___ is in the water.",
      "fun_fact": "Hippos can hold their breath for 5 minutes underwater!",
      "category": "animals",
      "difficulty_level": 1,
      "scene_item": {
        "position_x": 58,
        "position_y": 82,
        "scale": 1.2,
        "z_index": 22,
        "idle_animation": "float",
        "touch_animation": "bounce",
        "touch_response_text": "I am a hippo! I love the water!",
        "glow_color": "#9370DB",
        "discovery_points": 10
      }
    }
  ]'::jsonb,
  '/assets/icons/lands/safari.png',
  'vocabulary',
  ARRAY['animals', 'nature', 'safari', 'exploration', 'beginner'],
  true
)
ON CONFLICT (slug) DO UPDATE SET
  land_data = EXCLUDED.land_data,
  activities_data = EXCLUDED.activities_data,
  vocabulary_data = EXCLUDED.vocabulary_data,
  updated_at = NOW();

-- ============================================================================
-- TEMPLATE: FRUIT ORCHARD (Exploration-based Food Land)
-- ============================================================================

INSERT INTO land_templates (
  id, name, slug, description,
  target_age_min, target_age_max,
  character_name, character_avatar_url, character_personality,
  land_data, activities_data, vocabulary_data,
  icon_url, category, tags, is_official
) VALUES (
  'e2222222-2222-2222-2222-222222222222',
  'Fruit Orchard',
  'fruit-orchard-explorable',
  'Visit the colorful Fruit Orchard! Touch each fruit to learn its name and color.',
  4, 7,
  'Fiona Farmer',
  '/assets/characters/fiona-farmer.png',
  'Fiona loves growing fruits and teaching kids about healthy eating. She is warm and patient.',
  '{
    "name": "Fruit Orchard",
    "theme": "food",
    "scene_background_url": "/assets/scenes/fruit-orchard-bg.jpg",
    "scene_ambient_sound_url": "/assets/audio/ambience/farm.mp3",
    "exploration_mode": "free",
    "min_discoveries_for_activities": 3,
    "show_discovery_progress": true,
    "guide_hints_enabled": true,
    "hint_delay_seconds": 10
  }'::jsonb,
  '[
    {
      "title": "Find the Fruit",
      "activity_type": "find_the_word",
      "requires_discovery_count": 3,
      "uses_discovered_vocabulary": true,
      "intro_narrative": "Can you find the fruit I say?"
    },
    {
      "title": "Fruit Match",
      "activity_type": "matching_game",
      "requires_discovery_count": 3,
      "uses_discovered_vocabulary": true,
      "intro_narrative": "Match each fruit to its name!"
    },
    {
      "title": "Say the Fruit",
      "activity_type": "say_it",
      "requires_discovery_count": 4,
      "uses_discovered_vocabulary": true,
      "intro_narrative": "Say the name of each fruit!"
    }
  ]'::jsonb,
  '[
    {
      "word": "apple",
      "phonetic": "/ˈæp.əl/",
      "translation_zh_tw": "蘋果",
      "image_url": "/assets/vocab/food/apple.png",
      "audio_url": "/assets/audio/words/apple.mp3",
      "example_sentence": "The apple is red and sweet.",
      "sentence_frame": "I like ___s.",
      "category": "food",
      "scene_item": {
        "position_x": 18,
        "position_y": 42,
        "scale": 1.0,
        "idle_animation": "sway",
        "touch_animation": "bounce",
        "touch_response_text": "A red apple! Yummy!",
        "glow_color": "#FF6B6B"
      }
    },
    {
      "word": "banana",
      "phonetic": "/bəˈnæn.ə/",
      "translation_zh_tw": "香蕉",
      "image_url": "/assets/vocab/food/banana.png",
      "audio_url": "/assets/audio/words/banana.mp3",
      "example_sentence": "The banana is yellow and curved.",
      "sentence_frame": "I eat a ___.",
      "category": "food",
      "scene_item": {
        "position_x": 42,
        "position_y": 35,
        "scale": 1.0,
        "idle_animation": "sway",
        "touch_animation": "wiggle",
        "touch_response_text": "A yellow banana!",
        "glow_color": "#FFD93D"
      }
    },
    {
      "word": "orange",
      "phonetic": "/ˈɔːr.ɪndʒ/",
      "translation_zh_tw": "橘子",
      "image_url": "/assets/vocab/food/orange.png",
      "audio_url": "/assets/audio/words/orange.mp3",
      "example_sentence": "The orange is round and juicy.",
      "sentence_frame": "This is an ___.",
      "category": "food",
      "scene_item": {
        "position_x": 68,
        "position_y": 48,
        "scale": 1.0,
        "idle_animation": "bounce",
        "touch_animation": "spin",
        "touch_response_text": "An orange! Round and sweet!",
        "glow_color": "#FFA500"
      }
    },
    {
      "word": "grape",
      "phonetic": "/ɡreɪp/",
      "translation_zh_tw": "葡萄",
      "image_url": "/assets/vocab/food/grapes.png",
      "audio_url": "/assets/audio/words/grape.mp3",
      "example_sentence": "Grapes grow in bunches.",
      "sentence_frame": "I like ___s.",
      "category": "food",
      "scene_item": {
        "position_x": 85,
        "position_y": 38,
        "scale": 0.9,
        "idle_animation": "sway",
        "touch_animation": "bounce",
        "touch_response_text": "Purple grapes! So many!",
        "glow_color": "#9B59B6"
      }
    },
    {
      "word": "watermelon",
      "phonetic": "/ˈwɔː.t̬ɚˌmel.ən/",
      "translation_zh_tw": "西瓜",
      "image_url": "/assets/vocab/food/watermelon.png",
      "audio_url": "/assets/audio/words/watermelon.mp3",
      "example_sentence": "Watermelon is big and refreshing.",
      "sentence_frame": "The ___ is big.",
      "category": "food",
      "scene_item": {
        "position_x": 32,
        "position_y": 78,
        "scale": 1.4,
        "idle_animation": "breathe",
        "touch_animation": "bounce",
        "touch_response_text": "A big watermelon! Green outside, red inside!",
        "glow_color": "#2ECC71"
      }
    }
  ]'::jsonb,
  '/assets/icons/lands/fruit.png',
  'vocabulary',
  ARRAY['food', 'fruits', 'colors', 'exploration', 'beginner'],
  true
)
ON CONFLICT (slug) DO UPDATE SET
  land_data = EXCLUDED.land_data,
  activities_data = EXCLUDED.activities_data,
  vocabulary_data = EXCLUDED.vocabulary_data,
  updated_at = NOW();

-- ============================================================================
-- TEMPLATE: COLOR CANYON (Exploration-based Colors Land)
-- ============================================================================

INSERT INTO land_templates (
  id, name, slug, description,
  target_age_min, target_age_max,
  character_name, character_avatar_url, character_personality,
  land_data, activities_data, vocabulary_data,
  icon_url, category, tags, is_official
) VALUES (
  'e3333333-3333-3333-3333-333333333333',
  'Color Canyon',
  'color-canyon-explorable',
  'A magical canyon full of colorful objects! Touch them to learn color names.',
  4, 6,
  'Rainbow Rex',
  '/assets/characters/rainbow-rex.png',
  'Rainbow Rex is a friendly dinosaur who LOVES colors! Very enthusiastic and silly.',
  '{
    "name": "Color Canyon",
    "theme": "colors",
    "scene_background_url": "/assets/scenes/color-canyon-bg.jpg",
    "exploration_mode": "free",
    "min_discoveries_for_activities": 4,
    "guide_hints_enabled": true,
    "hint_delay_seconds": 8
  }'::jsonb,
  '[
    {
      "title": "Touch the Color",
      "activity_type": "find_the_word",
      "requires_discovery_count": 4,
      "uses_discovered_vocabulary": true,
      "intro_narrative": "Touch the color I say!"
    },
    {
      "title": "Color Match",
      "activity_type": "matching_game",
      "requires_discovery_count": 4,
      "uses_discovered_vocabulary": true,
      "intro_narrative": "Match the color words!"
    },
    {
      "title": "Say the Color",
      "activity_type": "say_it",
      "requires_discovery_count": 5,
      "uses_discovered_vocabulary": true,
      "intro_narrative": "What color is this? Say it!"
    }
  ]'::jsonb,
  '[
    {
      "word": "red",
      "phonetic": "/red/",
      "translation_zh_tw": "紅色",
      "image_url": "/assets/vocab/colors/red-balloon.png",
      "audio_url": "/assets/audio/words/red.mp3",
      "example_sentence": "The balloon is red.",
      "category": "colors",
      "scene_item": {
        "position_x": 15,
        "position_y": 22,
        "scale": 1.0,
        "idle_animation": "float",
        "touch_animation": "bounce",
        "touch_response_text": "RED! Like a fire truck!",
        "glow_color": "#FF0000"
      }
    },
    {
      "word": "blue",
      "phonetic": "/bluː/",
      "translation_zh_tw": "藍色",
      "image_url": "/assets/vocab/colors/blue-bird.png",
      "audio_url": "/assets/audio/words/blue.mp3",
      "example_sentence": "The bird is blue.",
      "category": "colors",
      "scene_item": {
        "position_x": 82,
        "position_y": 28,
        "scale": 0.9,
        "idle_animation": "bounce",
        "touch_animation": "jump",
        "touch_response_text": "BLUE! Like the sky!",
        "glow_color": "#0066FF"
      }
    },
    {
      "word": "yellow",
      "phonetic": "/ˈjel.oʊ/",
      "translation_zh_tw": "黃色",
      "image_url": "/assets/vocab/colors/yellow-sun.png",
      "audio_url": "/assets/audio/words/yellow.mp3",
      "example_sentence": "The sun is yellow.",
      "category": "colors",
      "scene_item": {
        "position_x": 50,
        "position_y": 12,
        "scale": 1.3,
        "idle_animation": "breathe",
        "touch_animation": "spin",
        "touch_response_text": "YELLOW! Bright like the sun!",
        "glow_color": "#FFD700"
      }
    },
    {
      "word": "green",
      "phonetic": "/ɡriːn/",
      "translation_zh_tw": "綠色",
      "image_url": "/assets/vocab/colors/green-frog.png",
      "audio_url": "/assets/audio/words/green.mp3",
      "example_sentence": "The frog is green.",
      "category": "colors",
      "scene_item": {
        "position_x": 28,
        "position_y": 72,
        "scale": 1.0,
        "idle_animation": "breathe",
        "touch_animation": "jump",
        "touch_response_text": "GREEN! Ribbit ribbit!",
        "glow_color": "#00FF00"
      }
    },
    {
      "word": "purple",
      "phonetic": "/ˈpɝː.pəl/",
      "translation_zh_tw": "紫色",
      "image_url": "/assets/vocab/colors/purple-flower.png",
      "audio_url": "/assets/audio/words/purple.mp3",
      "example_sentence": "The flower is purple.",
      "category": "colors",
      "scene_item": {
        "position_x": 68,
        "position_y": 68,
        "scale": 1.0,
        "idle_animation": "sway",
        "touch_animation": "wiggle",
        "touch_response_text": "PURPLE! A pretty flower!",
        "glow_color": "#9900FF"
      }
    },
    {
      "word": "orange",
      "phonetic": "/ˈɔːr.ɪndʒ/",
      "translation_zh_tw": "橘色",
      "image_url": "/assets/vocab/colors/orange-fish.png",
      "audio_url": "/assets/audio/words/orange.mp3",
      "example_sentence": "The fish is orange.",
      "category": "colors",
      "scene_item": {
        "position_x": 88,
        "position_y": 78,
        "scale": 0.9,
        "idle_animation": "float",
        "touch_animation": "wiggle",
        "touch_response_text": "ORANGE! Swim little fish!",
        "glow_color": "#FF6600"
      }
    }
  ]'::jsonb,
  '/assets/icons/lands/colors.png',
  'vocabulary',
  ARRAY['colors', 'exploration', 'beginner', 'young-learners'],
  true
)
ON CONFLICT (slug) DO UPDATE SET
  land_data = EXCLUDED.land_data,
  activities_data = EXCLUDED.activities_data,
  vocabulary_data = EXCLUDED.vocabulary_data,
  updated_at = NOW();

-- ============================================================================
-- Log completion
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'Explorable Learning World templates seeded successfully!';
  RAISE NOTICE 'Created: Safari Savanna, Fruit Orchard, Color Canyon (exploration-based)';
END $$;
