import Anthropic from '@anthropic-ai/sdk'
import crypto from 'crypto'
import db from '../database/db.js'

// Initialize Claude client
const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
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
      model: 'claude-3-5-sonnet-20241022',
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
    return `${systemPrompt}Generate ${count} comprehension questions about: ${basePrompt}

Requirements:
- Mix of question types (multiple choice, short answer, analysis)
- Difficulty: ${difficulty}
- Questions should build from basic recall to higher-order thinking
- For multiple choice: provide 4 options

Return as JSON in this exact format:
{
  "questions": [
    {
      "type": "multiple_choice",
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "explanation": "..."
    },
    {
      "type": "short_answer",
      "question": "...",
      "sampleAnswer": "..."
    }
  ]
}`
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
  if (['questions', 'quiz', 'discussion'].includes(type)) {
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

export default {
  generateContent,
  generateEasierVersion,
  generateHarderVersion,
  transcribeVoicePrompt, // FUTURE
  textToSpeech          // FUTURE
}
