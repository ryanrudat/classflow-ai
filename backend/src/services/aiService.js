import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import crypto from 'crypto'
import db from '../database/db.js'

// Initialize Claude client
const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
})

// Initialize OpenAI client for DALL-E
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

/**
 * AI Service
 *
 * Architecture designed to be modular:
 * - Text generation: Claude API
 * - Voice input (FUTURE): OpenAI Whisper API
 * - Voice output (FUTURE): OpenAI TTS API
 *
 * Each function is independent and can be enhanced without breaking others.
 */

/**
 * Generate content using Claude AI
 * @param {string} prompt - The content to generate
 * @param {object} options - Generation options
 * @returns {object} Generated content + metadata
 */
export async function generateContent(prompt, options = {}) {
  const {
    type = 'reading',        // reading, questions, quiz, discussion
    subject = 'English',      // English, History, Social Studies, Government, Biology
    difficulty = 'medium',    // easy, medium, hard
    length = 500,             // For reading passages
    count = 5,                // For questions/quizzes
    maxTokens = 2000
  } = options

  try {
    // Generate cache key
    const cacheKey = generateCacheKey(prompt, options)

    // Check cache first
    const cached = await checkCache(cacheKey)
    if (cached) {
      return {
        content: cached.response,
        cached: true,
        generationTime: 0
      }
    }

    // Build prompt based on type
    const fullPrompt = buildPrompt(prompt, type, subject, difficulty, length, count)

    // Generate with Claude
    const startTime = Date.now()

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: maxTokens,
      messages: [{
        role: 'user',
        content: fullPrompt
      }]
    })

    const generationTime = Date.now() - startTime
    const content = message.content[0].text

    // Parse response based on type
    const parsedContent = parseResponse(content, type)

    // Cache the result
    await saveToCache(cacheKey, prompt, parsedContent)

    return {
      content: parsedContent,
      cached: false,
      generationTime,
      model: 'claude-3-5-sonnet'
    }

  } catch (error) {
    console.error('AI generation error:', error)
    throw new Error(`AI generation failed: ${error.message}`)
  }
}

/**
 * FUTURE: Voice input function (Whisper API integration point)
 *
 * This is where you'll integrate OpenAI Whisper for speech-to-text
 * Teacher speaks prompt → Whisper converts to text → generateContent()
 *
 * @param {Buffer} audioBuffer - Audio file from teacher
 * @returns {string} Transcribed text
 */
export async function transcribeVoicePrompt(audioBuffer) {
  // TODO: Week 5-6 - Integrate OpenAI Whisper API here
  //
  // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  // const transcription = await openai.audio.transcriptions.create({
  //   file: audioBuffer,
  //   model: 'whisper-1'
  // })
  // return transcription.text

  throw new Error('Voice input not yet implemented - coming in Week 5-6')
}

/**
 * FUTURE: Text-to-speech function (TTS integration point)
 *
 * This is where you'll integrate OpenAI TTS for reading content aloud
 * Generated content → TTS → audio file → play to students
 *
 * @param {string} text - Content to convert to speech
 * @returns {Buffer} Audio file
 */
export async function textToSpeech(text) {
  // TODO: Week 5-6 - Integrate OpenAI TTS API here if needed
  //
  // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  // const mp3 = await openai.audio.speech.create({
  //   model: 'tts-1',
  //   voice: 'alloy',
  //   input: text
  // })
  // return Buffer.from(await mp3.arrayBuffer())

  throw new Error('Text-to-speech not yet implemented')
}

/**
 * Build subject-specific prompt
 */
function buildPrompt(basePrompt, type, subject, difficulty, length, count) {
  // Subject context
  const subjectContext = {
    'English': 'You are an expert English teacher creating engaging content for high school students.',
    'History': 'You are an expert History teacher creating engaging content for high school students.',
    'Social Studies': 'You are an expert Social Studies teacher creating engaging content for high school students.',
    'Government': 'You are an expert Government teacher creating engaging content for high school students.',
    'Biology': 'You are an expert Biology teacher creating engaging content for high school students.'
  }

  // Difficulty adjustments
  const difficultyGuide = {
    'easy': 'Use simple vocabulary and clear explanations. Break down complex concepts into simple steps. Include helpful hints.',
    'medium': 'Use grade-appropriate vocabulary. Balance explanation with challenge.',
    'hard': 'Use advanced vocabulary and concepts. Encourage critical thinking and deeper analysis.'
  }

  let systemPrompt = `${subjectContext[subject] || subjectContext['English']}

${difficultyGuide[difficulty]}

`

  // Type-specific prompts
  if (type === 'reading') {
    return `${systemPrompt}Generate a reading passage about: ${basePrompt}

Requirements:
- Length: approximately ${length} words
- Reading level: ${difficulty}
- Include specific details, examples, and context
- Make it engaging and educational
- Format as plain text with paragraphs

Return ONLY the reading passage, no titles or metadata.`
  }

  if (type === 'questions') {
    return `${systemPrompt}Generate ${count} open-ended critical thinking questions about: ${basePrompt}

Requirements:
- ALL questions must be open-ended (NO multiple choice)
- Focus on analysis, evaluation, and deeper understanding
- Encourage explanation, reasoning, and critical thinking
- Difficulty: ${difficulty}
- Questions should require students to explain their thinking
- Avoid simple recall questions - focus on "why" and "how"

Return as JSON array of question strings (simple format):
{
  "questions": [
    "Why do you think...?",
    "How would you explain...?",
    "What evidence supports...?",
    "Compare and contrast...",
    "What might happen if...?"
  ]
}

DO NOT include multiple choice options. These are discussion/essay questions.`
  }

  if (type === 'quiz') {
    return `${systemPrompt}Generate a ${count}-question quiz about: ${basePrompt}

Requirements:
- All multiple choice with 4 options each
- Difficulty: ${difficulty}
- Cover main concepts comprehensively
- Include brief explanations for correct answers

Return as JSON in this exact format:
{
  "quiz": [
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "explanation": "..."
    }
  ]
}`
  }

  if (type === 'mixed') {
    // Mixed type: combination of multiple choice and critical thinking
    const quizCount = Math.ceil(count / 2)
    const questionCount = count - quizCount

    return `${systemPrompt}Generate a balanced assessment with BOTH question types about: ${basePrompt}

Requirements:
- Generate ${quizCount} multiple-choice questions (with 4 options each)
- Generate ${questionCount} open-ended critical thinking questions
- Difficulty: ${difficulty}
- Multiple choice questions test knowledge and comprehension
- Critical thinking questions require analysis and explanation

Return as JSON in this exact format:
{
  "quiz": [
    {
      "question": "Multiple choice question...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "Why this answer is correct"
    }
  ],
  "questions": [
    "Open-ended critical thinking question 1?",
    "Open-ended critical thinking question 2?"
  ]
}

Ensure clear separation between objective assessment (quiz) and analytical thinking (questions).`
  }

  if (type === 'discussion') {
    return `${systemPrompt}Generate ${count} discussion prompts about: ${basePrompt}

Requirements:
- Open-ended questions that encourage critical thinking
- Suitable for ${difficulty} level students
- Questions should spark debate and analysis

Return as JSON in this format:
{
  "prompts": [
    {
      "question": "...",
      "context": "Brief context to frame the question"
    }
  ]
}`
  }

  // Default fallback
  return `${systemPrompt}${basePrompt}`
}

/**
 * Parse AI response based on content type
 */
function parseResponse(content, type) {
  // For JSON types, try to parse
  if (['questions', 'quiz', 'mixed', 'discussion'].includes(type)) {
    try {
      // Extract JSON from response (in case AI added explanatory text)
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      return JSON.parse(content)
    } catch (e) {
      // If parsing fails, return as plain text with error flag
      return {
        error: 'Failed to parse AI response as JSON',
        rawContent: content
      }
    }
  }

  // For plain text (reading passages), return as is
  return content
}

/**
 * Generate cache key from prompt + options
 */
function generateCacheKey(prompt, options) {
  const cacheString = JSON.stringify({ prompt, ...options })
  return crypto.createHash('md5').update(cacheString).digest('hex')
}

/**
 * Check if content exists in cache
 */
async function checkCache(cacheKey) {
  try {
    const result = await db.query(
      'SELECT response, usage_count FROM ai_cache WHERE prompt_hash = $1',
      [cacheKey]
    )

    if (result.rows.length > 0) {
      // Update usage count and last used timestamp
      await db.query(
        'UPDATE ai_cache SET usage_count = usage_count + 1, last_used = NOW() WHERE prompt_hash = $1',
        [cacheKey]
      )

      return result.rows[0]
    }

    return null
  } catch (error) {
    console.error('Cache check error:', error)
    return null // Don't fail if cache check fails
  }
}

/**
 * Save generated content to cache
 */
async function saveToCache(cacheKey, prompt, response) {
  try {
    await db.query(
      `INSERT INTO ai_cache (prompt_hash, prompt, response, usage_count, created_at, last_used)
       VALUES ($1, $2, $3, 1, NOW(), NOW())
       ON CONFLICT (prompt_hash) DO NOTHING`,
      [cacheKey, prompt, JSON.stringify(response)]
    )
  } catch (error) {
    console.error('Cache save error:', error)
    // Don't fail generation if caching fails
  }
}

/**
 * Generate easier version of content for struggling students
 */
export async function generateEasierVersion(originalContent, studentErrors) {
  const prompt = `The student struggled with this content. Create an easier version:

Original: ${JSON.stringify(originalContent).substring(0, 500)}...

Student errors: ${JSON.stringify(studentErrors)}

Create a simpler version with:
- Shorter sentences
- Simpler vocabulary
- More scaffolding and hints
- Step-by-step breakdown`

  return await generateContent(prompt, {
    type: 'reading',
    difficulty: 'easy'
  })
}

/**
 * Generate harder version for advanced students
 */
export async function generateHarderVersion(originalContent) {
  const prompt = `Create a more challenging version of this content:

Original: ${JSON.stringify(originalContent).substring(0, 500)}...

Make it more advanced with:
- Complex vocabulary
- Deeper analysis questions
- Extension concepts
- Critical thinking challenges`

  return await generateContent(prompt, {
    type: 'questions',
    difficulty: 'hard'
  })
}

/**
 * Generate activity content for Learning Worlds
 * @param {object} params - Activity parameters
 * @returns {object} Generated content based on activity type
 */
export async function generateActivityContent(params) {
  const {
    activityType,
    landName,
    landTheme,
    topic,
    ageLevel = 2,       // 1 = 4-6, 2 = 7-8, 3 = 9-10
    itemCount = 6,
    language = 'English',
    supportLanguage = 'Chinese (Traditional)'
  } = params

  // Age level descriptions for prompts
  const ageLevelGuide = {
    1: 'Ages 4-6: Use single words only, very simple vocabulary, no sentences. Focus on basic, concrete nouns.',
    2: 'Ages 7-8: Use simple words and short phrases (2-4 words). Simple, common vocabulary.',
    3: 'Ages 9-10: Use words and short sentences. Can include slightly more advanced vocabulary.'
  }

  // Build prompt based on activity type
  let prompt = ''

  if (activityType === 'vocabulary_touch') {
    prompt = `You are creating vocabulary content for a Learning World activity for young ${language} learners (${ageLevelGuide[ageLevel]}).

Land: ${landName}
Theme: ${landTheme || 'General'}
Topic: ${topic || landName}

Generate ${itemCount} vocabulary items that fit this theme. Each item should be appropriate for the age level.

Return as JSON in this exact format:
{
  "items": [
    {
      "word": "dog",
      "emoji": "🐕",
      "phrase": "The dog barks",
      "translation": "狗",
      "category": "animals"
    }
  ],
  "instructions": "Touch each picture to learn the word!"
}

Requirements:
- Each word should be a common, child-friendly word related to the theme
- Include an appropriate emoji that represents the word
- The phrase should use the word in context (for age level 2+)
- Include Traditional Chinese translation
- All items should be thematically connected
- For age level 1, phrase can be just the word repeated or very simple`
  }

  else if (activityType === 'matching_game') {
    prompt = `You are creating a matching game for young ${language} learners (${ageLevelGuide[ageLevel]}).

Land: ${landName}
Theme: ${landTheme || 'General'}
Topic: ${topic || landName}

Generate ${itemCount} matching pairs that fit this theme.

Return as JSON in this exact format:
{
  "pairs": [
    {
      "id": 1,
      "word": "red",
      "match": "🔴",
      "matchType": "emoji",
      "translation": "紅色"
    }
  ],
  "instructions": "Match each word with its picture!"
}

Requirements:
- Words should be age-appropriate
- Each word matches to an emoji
- Include Traditional Chinese translation
- Pairs should be thematically connected to ${landName}`
  }

  else if (activityType === 'listen_point') {
    prompt = `You are creating a "Listen and Point" activity for young ${language} learners (${ageLevelGuide[ageLevel]}).

Land: ${landName}
Theme: ${landTheme || 'General'}
Topic: ${topic || landName}

Generate ${itemCount} items where students hear a word/phrase and point to the correct image.

Return as JSON in this exact format:
{
  "items": [
    {
      "word": "apple",
      "emoji": "🍎",
      "prompt": "Point to the apple!",
      "translation": "蘋果"
    }
  ],
  "instructions": "Listen carefully and point to the right picture!"
}

Requirements:
- Simple, clear prompts appropriate for the age level
- Use common vocabulary related to the theme
- Include Traditional Chinese translation`
  }

  else if (activityType === 'tpr_action') {
    prompt = `You are creating TPR (Total Physical Response) action prompts for young ${language} learners (${ageLevelGuide[ageLevel]}).

Land: ${landName}
Theme: ${landTheme || 'General'}
Topic: ${topic || landName}

Generate ${itemCount} TPR actions that fit this theme. These are physical actions students perform.

Return as JSON in this exact format:
{
  "actions": [
    {
      "command": "Jump like a frog!",
      "emoji": "🐸",
      "demonstration": "Jump up and down with your arms out",
      "translation": "像青蛙一樣跳！"
    }
  ],
  "instructions": "Follow the actions! Move your body!"
}

Requirements:
- Actions should be safe for classroom
- Fun and engaging for young learners
- Related to the theme when possible
- Include Traditional Chinese translation`
  }

  else if (activityType === 'coloring') {
    prompt = `You are creating a coloring activity vocabulary list for young ${language} learners (${ageLevelGuide[ageLevel]}).

Land: ${landName}
Theme: ${landTheme || 'General'}
Topic: ${topic || landName}

Generate ${itemCount} items to color with color vocabulary practice.

Return as JSON in this exact format:
{
  "items": [
    {
      "object": "sun",
      "emoji": "☀️",
      "suggestedColor": "yellow",
      "colorEmoji": "🟡",
      "prompt": "Color the sun yellow!",
      "translation": "太陽"
    }
  ],
  "colors": ["red", "blue", "yellow", "green", "orange", "purple", "pink", "brown"],
  "instructions": "Touch a color, then touch what you want to color!"
}

Requirements:
- Objects should be simple and recognizable
- Colors should be basic for younger learners
- Include Traditional Chinese translation`
  }

  else {
    // Generic activity content
    prompt = `You are creating content for a "${activityType}" learning activity for young ${language} learners (${ageLevelGuide[ageLevel]}).

Land: ${landName}
Theme: ${landTheme || 'General'}
Topic: ${topic || landName}

Generate ${itemCount} appropriate items for this activity type.

Return as JSON with items appropriate for the activity type. Include:
- Clear instructions
- Age-appropriate vocabulary
- Traditional Chinese translations where applicable
- Emojis to make it visual and engaging`
  }

  try {
    const startTime = Date.now()

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const generationTime = Date.now() - startTime
    const content = message.content[0].text

    // Parse JSON response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          content: parsed,
          generationTime,
          model: 'claude-sonnet-4-5'
        }
      }
      return {
        content: JSON.parse(content),
        generationTime,
        model: 'claude-sonnet-4-5'
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      return {
        error: 'Failed to parse AI response',
        rawContent: content,
        generationTime
      }
    }

  } catch (error) {
    console.error('Activity content generation error:', error)
    throw new Error(`AI generation failed: ${error.message}`)
  }
}

/**
 * Generate an image using DALL-E 3
 * Optimized for educational content with child-friendly output
 * Uses a strict, consistent style for visual cohesion across all images
 *
 * @param {string} word - The word/concept to visualize
 * @param {object} options - Generation options
 * @returns {object} Generated image URL and metadata
 */
export async function generateImage(word, options = {}) {
  const {
    style = 'flat',     // flat, simple, cute
    ageLevel = 2,       // 1 = 4-6, 2 = 7-8, 3 = 9-10
    category = null,    // animals, food, colors, etc.
    size = '1024x1024'  // 1024x1024, 1792x1024, 1024x1792
  } = options

  // Build a very strict, explicit prompt that DALL-E 3 will follow
  // The key is to be extremely specific and repetitive about the style
  const prompt = `Create a simple educational flashcard illustration of: ${word}${category ? ` (category: ${category})` : ''}

CRITICAL STYLE REQUIREMENTS - MUST FOLLOW EXACTLY:
1. FLAT DESIGN: No gradients, no shadows, no 3D effects, no shading. Only flat, solid colors.
2. SIMPLE SHAPES: Use basic geometric shapes. Circles, ovals, rectangles. No complex details.
3. SOLID COLORS: Bold, bright, solid fill colors. No textures, no patterns, no gradients.
4. WHITE BACKGROUND: Pure white (#FFFFFF) background only. Nothing else.
5. CENTERED: Subject centered in frame with generous padding.
6. SINGLE SUBJECT: Show only ONE ${word}, nothing else in the image.
7. NO TEXT: Absolutely no text, letters, words, labels, or watermarks anywhere.
8. CHILD-FRIENDLY: Friendly, approachable appearance suitable for ages 4-10.

STYLE REFERENCE: Think of simple educational app icons or emoji-style illustrations.
Similar to: Duolingo vocabulary cards, Google Material Design icons, or simple children's book illustrations.

The result should look like a clean, professional educational flashcard that could be printed.
DO NOT add any artistic interpretation, abstract elements, or creative flourishes.
Keep it SIMPLE, FLAT, and RECOGNIZABLE.`

  try {
    console.log('🎨 Generating DALL-E image for:', word)

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: size,
      quality: 'hd',      // HD quality for cleaner lines
      style: 'natural'    // Natural style is more predictable than vivid
    })

    const imageUrl = response.data[0].url
    const revisedPrompt = response.data[0].revised_prompt

    console.log('✅ Image generated successfully')
    console.log('📝 Revised prompt:', revisedPrompt?.substring(0, 100) + '...')

    return {
      success: true,
      url: imageUrl,
      word: word,
      prompt: prompt,
      revisedPrompt: revisedPrompt,
      model: 'dall-e-3'
    }

  } catch (error) {
    console.error('DALL-E image generation error:', error)

    // Handle specific OpenAI errors
    if (error.code === 'content_policy_violation') {
      return {
        success: false,
        error: 'Content policy violation - try a different word',
        word: word
      }
    }

    if (error.code === 'rate_limit_exceeded') {
      return {
        success: false,
        error: 'Rate limit exceeded - please try again in a moment',
        word: word
      }
    }

    return {
      success: false,
      error: error.message || 'Failed to generate image',
      word: word
    }
  }
}

/**
 * Generate multiple images for a batch of words
 * @param {array} words - Array of words to generate images for
 * @param {object} options - Generation options
 * @returns {array} Array of results
 */
export async function generateImageBatch(words, options = {}) {
  const results = []

  // Process sequentially to avoid rate limits
  for (const word of words) {
    const result = await generateImage(word, options)
    results.push(result)

    // Small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  return results
}

/**
 * Generate a character profile using Claude AI
 * Creates a unique character with name, personality, catchphrase, and visual description
 *
 * @param {object} params - Character generation parameters
 * @returns {object} Generated character profile
 */
export async function generateCharacterProfile(params) {
  const {
    theme = 'friendly helper',
    landContext = null,
    worldTheme = 'fantasy',
    existingCharacters = []
  } = params

  const existingNames = existingCharacters.map(c => c.name).join(', ')

  const prompt = `Generate a unique character for a children's educational app.
Theme: ${theme}
World Theme: ${worldTheme}
${landContext ? `Land Context: ${landContext}` : ''}
${existingNames ? `Existing characters (avoid similar names): ${existingNames}` : ''}

Create a character that is:
- Friendly and encouraging but NOT babyish or overly cute
- Has a distinct personality that kids ages 4-10 would enjoy
- Suitable for language learning activities
- Memorable and visually interesting

Return JSON in this exact format:
{
  "name": "character full name (e.g., 'Captain Coral')",
  "shortName": "nickname or short name (e.g., 'Coral')",
  "species": "animal or creature type (e.g., 'sea turtle', 'owl', 'robot')",
  "personalityTraits": ["trait1", "trait2", "trait3"],
  "catchphrase": "a memorable phrase they say (short, fun, encouraging)",
  "voiceStyle": "friendly|playful|wise|adventurous",
  "visualDescription": "detailed description for image generation - include colors, clothing/accessories, expression, pose"
}

Make the character unique and memorable. The visual description should be specific enough for image generation.`

  try {
    const startTime = Date.now()

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const generationTime = Date.now() - startTime
    const content = message.content[0].text

    // Parse JSON response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          success: true,
          character: parsed,
          generationTime,
          model: 'claude-sonnet-4-5'
        }
      }
      return {
        success: true,
        character: JSON.parse(content),
        generationTime,
        model: 'claude-sonnet-4-5'
      }
    } catch (parseError) {
      console.error('Failed to parse character profile:', parseError)
      return {
        success: false,
        error: 'Failed to parse AI response',
        rawContent: content,
        generationTime
      }
    }

  } catch (error) {
    console.error('Character profile generation error:', error)
    return {
      success: false,
      error: error.message || 'Failed to generate character profile'
    }
  }
}

/**
 * Generate a character avatar using DALL-E 3
 * Optimized for educational character art with consistent style
 *
 * @param {object} character - Character profile from generateCharacterProfile
 * @returns {object} Generated image URL and metadata
 */
export async function generateCharacterAvatar(character) {
  const {
    name,
    species,
    personalityTraits = [],
    visualDescription
  } = character

  // Build a detailed prompt for DALL-E with strict style requirements
  const prompt = `Create a character portrait of a friendly ${species} named ${name} for an educational children's app.

STYLE REQUIREMENTS:
1. Modern, clean illustration style similar to Pixar/Disney junior characters
2. Soft, rounded shapes with gentle 3D shading
3. Large, expressive, friendly eyes
4. Warm, inviting color palette
5. Simple, uncluttered composition

CHARACTER DETAILS:
- Species: ${species}
- Personality: ${personalityTraits.join(', ')}
${visualDescription ? `- Visual details: ${visualDescription}` : ''}

COMPOSITION:
- Portrait/bust shot (head and upper body)
- Character centered in frame
- Soft pastel gradient background (light blue, pink, or yellow tones)
- Character facing slightly toward viewer with welcoming expression

RESTRICTIONS:
- NO text, labels, or watermarks
- NOT babyish or overly cute - appealing to ages 4-10
- Professional quality suitable for educational app
- Single character only`

  try {
    console.log('🎨 Generating character avatar for:', name)

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'hd',
      style: 'natural'
    })

    const imageUrl = response.data[0].url
    const revisedPrompt = response.data[0].revised_prompt

    console.log('✅ Character avatar generated successfully')

    return {
      success: true,
      url: imageUrl,
      characterName: name,
      prompt: prompt,
      revisedPrompt: revisedPrompt,
      model: 'dall-e-3'
    }

  } catch (error) {
    console.error('Character avatar generation error:', error)

    if (error.code === 'content_policy_violation') {
      return {
        success: false,
        error: 'Content policy violation - try different character traits',
        characterName: name
      }
    }

    if (error.code === 'rate_limit_exceeded') {
      return {
        success: false,
        error: 'Rate limit exceeded - please try again in a moment',
        characterName: name
      }
    }

    return {
      success: false,
      error: error.message || 'Failed to generate avatar',
      characterName: name
    }
  }
}

export default {
  generateContent,
  generateEasierVersion,
  generateHarderVersion,
  generateActivityContent,
  generateImage,
  generateImageBatch,
  generateCharacterProfile,
  generateCharacterAvatar,
  transcribeVoicePrompt, // FUTURE
  textToSpeech          // FUTURE
}
