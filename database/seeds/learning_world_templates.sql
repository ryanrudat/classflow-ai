-- Seed file: Pre-built Learning World Templates
-- Run after migration 027_add_learning_worlds.sql
-- Contains Animals Land and Color Canyon templates

-- ============================================================================
-- ANIMALS LAND TEMPLATE
-- ============================================================================
INSERT INTO land_templates (
  name, slug, description,
  target_age_min, target_age_max,
  character_name, character_avatar_url, character_personality,
  land_data, activities_data, vocabulary_data,
  category, tags, is_official
) VALUES (
  'Animals Land',
  'animals-land',
  'Learn animal vocabulary through fun activities! Meet Leo the Lion and discover pets, farm animals, and zoo creatures.',
  4, 10,
  'Leo the Lion',
  NULL,
  'Leo is a friendly, encouraging lion who loves teaching kids about animals. His catchphrase is "Roooar! Let''s learn together!"',

  -- land_data
  '{
    "name": "Animals Land",
    "slug": "animals-land",
    "description": "A fun place to learn about animals!",
    "introStory": "Welcome to Animals Land! I''m Leo the Lion. Let''s meet some amazing animals together!",
    "completionStory": "Roooar! You learned all the animals! You''re an animal expert now!",
    "mapPositionX": 30,
    "mapPositionY": 40,
    "targetVocabulary": ["dog", "cat", "bird", "fish", "elephant", "lion", "monkey", "horse", "cow", "pig", "duck", "rabbit"],
    "characterCatchphrase": "Roooar! Let''s learn together!"
  }'::jsonb,

  -- activities_data
  '[
    {
      "title": "Meet the Animals",
      "activityType": "vocabulary_touch",
      "instructions": "Touch each animal to hear its name!",
      "studentPrompt": "Touch the animals!",
      "introNarrative": "Let''s meet some animals! Touch each one to learn its name.",
      "successNarrative": "Great job! You know all these animals!",
      "content": {
        "items": [
          {"word": "dog", "emoji": "🐕", "imageUrl": null},
          {"word": "cat", "emoji": "🐱", "imageUrl": null},
          {"word": "bird", "emoji": "🐦", "imageUrl": null},
          {"word": "fish", "emoji": "🐠", "imageUrl": null},
          {"word": "rabbit", "emoji": "🐰", "imageUrl": null},
          {"word": "horse", "emoji": "🐴", "imageUrl": null}
        ]
      },
      "minAgeLevel": 1,
      "maxAgeLevel": 3,
      "level1Content": {
        "items": [
          {"word": "dog", "emoji": "🐕"},
          {"word": "cat", "emoji": "🐱"},
          {"word": "bird", "emoji": "🐦"},
          {"word": "fish", "emoji": "🐠"}
        ]
      },
      "estimatedDurationSeconds": 180,
      "tprPrompts": []
    },
    {
      "title": "Animal Sounds",
      "activityType": "listen_point",
      "instructions": "Listen and point to the animal you hear!",
      "studentPrompt": "Touch what you hear!",
      "introNarrative": "Can you find the animal that makes this sound?",
      "successNarrative": "You have great ears! You found all the animals!",
      "content": {
        "items": [
          {"word": "dog", "emoji": "🐕"},
          {"word": "cat", "emoji": "🐱"},
          {"word": "cow", "emoji": "🐄"},
          {"word": "duck", "emoji": "🦆"},
          {"word": "pig", "emoji": "🐷"},
          {"word": "bird", "emoji": "🐦"}
        ]
      },
      "minAgeLevel": 1,
      "maxAgeLevel": 3,
      "estimatedDurationSeconds": 180,
      "tprPrompts": []
    },
    {
      "title": "Move Like Animals",
      "activityType": "tpr_action",
      "instructions": "Follow along and move like the animals!",
      "studentPrompt": "Move like the animals!",
      "introNarrative": "Let''s move our bodies like animals! Can you do it?",
      "successNarrative": "Wow! You moved just like a real animal!",
      "content": {
        "prompts": [
          "Jump like a frog!",
          "Stomp like an elephant!",
          "Fly like a bird!",
          "Swim like a fish!",
          "Hop like a bunny!",
          "Roar like a lion!",
          "Waddle like a duck!",
          "Slither like a snake!"
        ]
      },
      "minAgeLevel": 1,
      "maxAgeLevel": 3,
      "estimatedDurationSeconds": 240,
      "tprPrompts": ["Jump like a frog!", "Stomp like an elephant!", "Fly like a bird!"]
    },
    {
      "title": "Match the Animals",
      "activityType": "matching_game",
      "instructions": "Match each word to its animal picture!",
      "studentPrompt": "Match the words!",
      "introNarrative": "Can you match the animal words to their pictures?",
      "successNarrative": "Perfect matching! You really know your animals!",
      "content": {
        "pairs": [
          {"word": "dog", "emoji": "🐕", "match": "dog", "matchEmoji": "🐕"},
          {"word": "cat", "emoji": "🐱", "match": "cat", "matchEmoji": "🐱"},
          {"word": "bird", "emoji": "🐦", "match": "bird", "matchEmoji": "🐦"},
          {"word": "fish", "emoji": "🐠", "match": "fish", "matchEmoji": "🐠"}
        ]
      },
      "minAgeLevel": 1,
      "maxAgeLevel": 3,
      "level1Content": {
        "pairs": [
          {"word": "dog", "emoji": "🐕", "match": "dog", "matchEmoji": "🐕"},
          {"word": "cat", "emoji": "🐱", "match": "cat", "matchEmoji": "🐱"}
        ]
      },
      "estimatedDurationSeconds": 180,
      "tprPrompts": []
    },
    {
      "title": "Color the Zoo",
      "activityType": "coloring",
      "instructions": "Choose colors and make your own zoo!",
      "studentPrompt": "Color the animals!",
      "introNarrative": "Let''s make these animals colorful! Pick a color and touch to paint!",
      "successNarrative": "What a beautiful zoo you made!",
      "content": {
        "sections": [
          {"id": "1", "label": "Lion", "defaultColor": "#fef3c7"},
          {"id": "2", "label": "Elephant", "defaultColor": "#e5e7eb"},
          {"id": "3", "label": "Monkey", "defaultColor": "#fde68a"},
          {"id": "4", "label": "Bird", "defaultColor": "#e0f2fe"},
          {"id": "5", "label": "Fish", "defaultColor": "#dbeafe"},
          {"id": "6", "label": "Rabbit", "defaultColor": "#fce7f3"}
        ]
      },
      "minAgeLevel": 1,
      "maxAgeLevel": 3,
      "estimatedDurationSeconds": 300,
      "tprPrompts": []
    }
  ]'::jsonb,

  -- vocabulary_data
  '[
    {"word": "dog", "phonetic": "/dɔɡ/", "partOfSpeech": "noun", "translationZhTw": "狗", "difficultyLevel": 1, "phraseLevel2": "The dog is barking.", "sentenceLevel3": "The friendly dog barks at visitors.", "category": "animals", "tags": ["pet", "mammal"]},
    {"word": "cat", "phonetic": "/kæt/", "partOfSpeech": "noun", "translationZhTw": "貓", "difficultyLevel": 1, "phraseLevel2": "The cat is sleeping.", "sentenceLevel3": "The lazy cat sleeps on the warm sofa.", "category": "animals", "tags": ["pet", "mammal"]},
    {"word": "bird", "phonetic": "/bɜːrd/", "partOfSpeech": "noun", "translationZhTw": "鳥", "difficultyLevel": 1, "phraseLevel2": "The bird is flying.", "sentenceLevel3": "The colorful bird flies through the sky.", "category": "animals", "tags": ["flying", "wild"]},
    {"word": "fish", "phonetic": "/fɪʃ/", "partOfSpeech": "noun", "translationZhTw": "魚", "difficultyLevel": 1, "phraseLevel2": "The fish is swimming.", "sentenceLevel3": "The golden fish swims in the bowl.", "category": "animals", "tags": ["pet", "water"]},
    {"word": "elephant", "phonetic": "/ˈel.ɪ.fənt/", "partOfSpeech": "noun", "translationZhTw": "大象", "difficultyLevel": 1, "phraseLevel2": "The elephant is big.", "sentenceLevel3": "Elephants live in Africa and Asia.", "category": "animals", "tags": ["zoo", "mammal", "large"]},
    {"word": "lion", "phonetic": "/ˈlaɪ.ən/", "partOfSpeech": "noun", "translationZhTw": "獅子", "difficultyLevel": 1, "phraseLevel2": "The lion roars loudly.", "sentenceLevel3": "The brave lion is called the king of the jungle.", "category": "animals", "tags": ["zoo", "mammal", "wild"]},
    {"word": "monkey", "phonetic": "/ˈmʌŋ.ki/", "partOfSpeech": "noun", "translationZhTw": "猴子", "difficultyLevel": 1, "phraseLevel2": "The monkey jumps.", "sentenceLevel3": "The playful monkey swings from tree to tree.", "category": "animals", "tags": ["zoo", "mammal"]},
    {"word": "horse", "phonetic": "/hɔːrs/", "partOfSpeech": "noun", "translationZhTw": "馬", "difficultyLevel": 1, "phraseLevel2": "The horse runs fast.", "sentenceLevel3": "The beautiful horse gallops across the field.", "category": "animals", "tags": ["farm", "mammal"]},
    {"word": "cow", "phonetic": "/kaʊ/", "partOfSpeech": "noun", "translationZhTw": "牛", "difficultyLevel": 1, "phraseLevel2": "The cow says moo.", "sentenceLevel3": "The gentle cow gives us fresh milk.", "category": "animals", "tags": ["farm", "mammal"]},
    {"word": "pig", "phonetic": "/pɪɡ/", "partOfSpeech": "noun", "translationZhTw": "豬", "difficultyLevel": 1, "phraseLevel2": "The pig is pink.", "sentenceLevel3": "The muddy pig rolls in the farm.", "category": "animals", "tags": ["farm", "mammal"]},
    {"word": "duck", "phonetic": "/dʌk/", "partOfSpeech": "noun", "translationZhTw": "鴨子", "difficultyLevel": 1, "phraseLevel2": "The duck says quack.", "sentenceLevel3": "The yellow duck waddles to the pond.", "category": "animals", "tags": ["farm", "bird"]},
    {"word": "rabbit", "phonetic": "/ˈræb.ɪt/", "partOfSpeech": "noun", "translationZhTw": "兔子", "difficultyLevel": 1, "phraseLevel2": "The rabbit hops.", "sentenceLevel3": "The fluffy rabbit hops around the garden.", "category": "animals", "tags": ["pet", "mammal"]}
  ]'::jsonb,

  'animals',
  ARRAY['vocabulary', 'beginner', 'pets', 'farm', 'zoo'],
  true
)
ON CONFLICT (slug) DO UPDATE SET
  land_data = EXCLUDED.land_data,
  activities_data = EXCLUDED.activities_data,
  vocabulary_data = EXCLUDED.vocabulary_data,
  updated_at = NOW();

-- ============================================================================
-- COLOR CANYON TEMPLATE
-- ============================================================================
INSERT INTO land_templates (
  name, slug, description,
  target_age_min, target_age_max,
  character_name, character_avatar_url, character_personality,
  land_data, activities_data, vocabulary_data,
  category, tags, is_official
) VALUES (
  'Color Canyon',
  'color-canyon',
  'Explore the colorful world of Color Canyon! Learn color words through painting, matching, and fun color hunts.',
  4, 10,
  'Coral the Coyote',
  NULL,
  'Coral is a playful, adventurous coyote who loves colors. Her catchphrase is "Howdy partner! What colors can you see?"',

  -- land_data
  '{
    "name": "Color Canyon",
    "slug": "color-canyon",
    "description": "A rainbow adventure awaits!",
    "introStory": "Howdy partner! Welcome to Color Canyon! I''m Coral the Coyote. Let''s discover all the beautiful colors together!",
    "completionStory": "Yee-haw! You''re a color expert now! The canyon has never looked so bright!",
    "mapPositionX": 70,
    "mapPositionY": 50,
    "targetVocabulary": ["red", "blue", "yellow", "green", "orange", "purple", "pink", "brown", "black", "white"],
    "characterCatchphrase": "Howdy partner! What colors can you see?"
  }'::jsonb,

  -- activities_data
  '[
    {
      "title": "Rainbow Colors",
      "activityType": "vocabulary_touch",
      "instructions": "Touch each color to learn its name!",
      "studentPrompt": "Touch the colors!",
      "introNarrative": "Look at all these beautiful colors! Touch each one to hear its name.",
      "successNarrative": "You learned all the colors of the rainbow!",
      "content": {
        "items": [
          {"word": "red", "emoji": "🔴", "hex": "#ef4444"},
          {"word": "blue", "emoji": "🔵", "hex": "#3b82f6"},
          {"word": "yellow", "emoji": "🟡", "hex": "#eab308"},
          {"word": "green", "emoji": "🟢", "hex": "#22c55e"},
          {"word": "orange", "emoji": "🟠", "hex": "#f97316"},
          {"word": "purple", "emoji": "🟣", "hex": "#a855f7"}
        ]
      },
      "minAgeLevel": 1,
      "maxAgeLevel": 3,
      "level1Content": {
        "items": [
          {"word": "red", "emoji": "🔴", "hex": "#ef4444"},
          {"word": "blue", "emoji": "🔵", "hex": "#3b82f6"},
          {"word": "yellow", "emoji": "🟡", "hex": "#eab308"},
          {"word": "green", "emoji": "🟢", "hex": "#22c55e"}
        ]
      },
      "estimatedDurationSeconds": 180,
      "tprPrompts": []
    },
    {
      "title": "Find the Color",
      "activityType": "listen_point",
      "instructions": "Listen and touch the color you hear!",
      "studentPrompt": "Touch what you hear!",
      "introNarrative": "Can you find the color I say? Listen carefully!",
      "successNarrative": "Amazing! You have super color hearing!",
      "content": {
        "items": [
          {"word": "red", "emoji": "🔴", "hex": "#ef4444"},
          {"word": "blue", "emoji": "🔵", "hex": "#3b82f6"},
          {"word": "yellow", "emoji": "🟡", "hex": "#eab308"},
          {"word": "green", "emoji": "🟢", "hex": "#22c55e"},
          {"word": "orange", "emoji": "🟠", "hex": "#f97316"},
          {"word": "purple", "emoji": "🟣", "hex": "#a855f7"}
        ]
      },
      "minAgeLevel": 1,
      "maxAgeLevel": 3,
      "estimatedDurationSeconds": 180,
      "tprPrompts": []
    },
    {
      "title": "Color Hunt",
      "activityType": "tpr_action",
      "instructions": "Find something in the room that matches each color!",
      "studentPrompt": "Find the colors around you!",
      "introNarrative": "Let''s go on a color hunt! Can you find these colors in your classroom?",
      "successNarrative": "Wow! You found so many colorful things!",
      "content": {
        "prompts": [
          "Touch something RED!",
          "Point to something BLUE!",
          "Find something YELLOW!",
          "Touch something GREEN!",
          "Point to something ORANGE!",
          "Find something WHITE!",
          "Touch something BLACK!",
          "Point to something PINK!"
        ]
      },
      "minAgeLevel": 1,
      "maxAgeLevel": 3,
      "estimatedDurationSeconds": 240,
      "tprPrompts": ["Touch something RED!", "Point to something BLUE!", "Find something YELLOW!"]
    },
    {
      "title": "Color Match",
      "activityType": "matching_game",
      "instructions": "Match the color words to the colors!",
      "studentPrompt": "Match the colors!",
      "introNarrative": "Can you match each word to its color?",
      "successNarrative": "Perfect color matching! You''re a color champion!",
      "content": {
        "pairs": [
          {"word": "red", "match": "🔴"},
          {"word": "blue", "match": "🔵"},
          {"word": "yellow", "match": "🟡"},
          {"word": "green", "match": "🟢"},
          {"word": "orange", "match": "🟠"},
          {"word": "purple", "match": "🟣"}
        ]
      },
      "minAgeLevel": 1,
      "maxAgeLevel": 3,
      "level1Content": {
        "pairs": [
          {"word": "red", "match": "🔴"},
          {"word": "blue", "match": "🔵"},
          {"word": "yellow", "match": "🟡"},
          {"word": "green", "match": "🟢"}
        ]
      },
      "estimatedDurationSeconds": 180,
      "tprPrompts": []
    },
    {
      "title": "Paint the Canyon",
      "activityType": "coloring",
      "instructions": "Use different colors to paint the canyon!",
      "studentPrompt": "Color the picture!",
      "introNarrative": "Let''s make Color Canyon even more colorful! Pick your favorite colors and paint!",
      "successNarrative": "What a beautiful painting! Color Canyon looks amazing!",
      "content": {
        "sections": [
          {"id": "1", "label": "Sky", "defaultColor": "#e0f2fe"},
          {"id": "2", "label": "Sun", "defaultColor": "#fef9c3"},
          {"id": "3", "label": "Mountains", "defaultColor": "#fed7aa"},
          {"id": "4", "label": "Cactus", "defaultColor": "#d1fae5"},
          {"id": "5", "label": "Ground", "defaultColor": "#fde68a"},
          {"id": "6", "label": "Rocks", "defaultColor": "#e5e7eb"}
        ],
        "colors": [
          {"name": "red", "hex": "#ef4444"},
          {"name": "blue", "hex": "#3b82f6"},
          {"name": "yellow", "hex": "#eab308"},
          {"name": "green", "hex": "#22c55e"},
          {"name": "orange", "hex": "#f97316"},
          {"name": "purple", "hex": "#a855f7"},
          {"name": "pink", "hex": "#ec4899"},
          {"name": "brown", "hex": "#a16207"}
        ]
      },
      "minAgeLevel": 1,
      "maxAgeLevel": 3,
      "estimatedDurationSeconds": 300,
      "tprPrompts": []
    }
  ]'::jsonb,

  -- vocabulary_data
  '[
    {"word": "red", "phonetic": "/red/", "partOfSpeech": "adjective", "translationZhTw": "紅色", "difficultyLevel": 1, "phraseLevel2": "The apple is red.", "sentenceLevel3": "The bright red fire truck speeds down the street.", "category": "colors", "tags": ["primary", "warm"]},
    {"word": "blue", "phonetic": "/bluː/", "partOfSpeech": "adjective", "translationZhTw": "藍色", "difficultyLevel": 1, "phraseLevel2": "The sky is blue.", "sentenceLevel3": "The deep blue ocean stretches to the horizon.", "category": "colors", "tags": ["primary", "cool"]},
    {"word": "yellow", "phonetic": "/ˈjel.oʊ/", "partOfSpeech": "adjective", "translationZhTw": "黃色", "difficultyLevel": 1, "phraseLevel2": "The sun is yellow.", "sentenceLevel3": "The bright yellow sunflowers face the sun.", "category": "colors", "tags": ["primary", "warm"]},
    {"word": "green", "phonetic": "/ɡriːn/", "partOfSpeech": "adjective", "translationZhTw": "綠色", "difficultyLevel": 1, "phraseLevel2": "The grass is green.", "sentenceLevel3": "The fresh green leaves grow on the trees.", "category": "colors", "tags": ["secondary", "cool"]},
    {"word": "orange", "phonetic": "/ˈɔːr.ɪndʒ/", "partOfSpeech": "adjective", "translationZhTw": "橘色", "difficultyLevel": 1, "phraseLevel2": "The orange is orange.", "sentenceLevel3": "The beautiful orange sunset fills the sky.", "category": "colors", "tags": ["secondary", "warm"]},
    {"word": "purple", "phonetic": "/ˈpɜː.pəl/", "partOfSpeech": "adjective", "translationZhTw": "紫色", "difficultyLevel": 1, "phraseLevel2": "Grapes are purple.", "sentenceLevel3": "The royal purple robe belongs to the king.", "category": "colors", "tags": ["secondary", "cool"]},
    {"word": "pink", "phonetic": "/pɪŋk/", "partOfSpeech": "adjective", "translationZhTw": "粉紅色", "difficultyLevel": 1, "phraseLevel2": "The flower is pink.", "sentenceLevel3": "The pretty pink flamingos stand in the water.", "category": "colors", "tags": ["warm"]},
    {"word": "brown", "phonetic": "/braʊn/", "partOfSpeech": "adjective", "translationZhTw": "棕色", "difficultyLevel": 1, "phraseLevel2": "The tree is brown.", "sentenceLevel3": "The cute brown puppy plays in the yard.", "category": "colors", "tags": ["neutral", "warm"]},
    {"word": "black", "phonetic": "/blæk/", "partOfSpeech": "adjective", "translationZhTw": "黑色", "difficultyLevel": 1, "phraseLevel2": "The night is black.", "sentenceLevel3": "The mysterious black cat sits on the fence.", "category": "colors", "tags": ["neutral"]},
    {"word": "white", "phonetic": "/waɪt/", "partOfSpeech": "adjective", "translationZhTw": "白色", "difficultyLevel": 1, "phraseLevel2": "Snow is white.", "sentenceLevel3": "The fluffy white clouds float in the sky.", "category": "colors", "tags": ["neutral"]}
  ]'::jsonb,

  'colors',
  ARRAY['vocabulary', 'beginner', 'colors', 'art'],
  true
)
ON CONFLICT (slug) DO UPDATE SET
  land_data = EXCLUDED.land_data,
  activities_data = EXCLUDED.activities_data,
  vocabulary_data = EXCLUDED.vocabulary_data,
  updated_at = NOW();

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Learning World templates seeded successfully!';
  RAISE NOTICE 'Created: Animals Land, Color Canyon';
END $$;
