import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Voice options for different character personalities
export const CHARACTER_VOICES = {
  friendly: 'alloy',     // Friendly, approachable
  playful: 'shimmer',    // Light, playful
  warm: 'nova',          // Warm, nurturing
  energetic: 'echo',     // Energetic, enthusiastic
  calm: 'fable',         // Calm, storytelling
  clear: 'onyx'          // Clear, instructional
}

// Voice speed adjustments for young learners
const SPEED_BY_AGE_LEVEL = {
  1: 0.85,  // Ages 4-6: Slower for comprehension
  2: 0.95,  // Ages 7-8: Slightly slower
  3: 1.0    // Ages 9-10: Normal speed
}

/**
 * Generate TTS audio for character speech
 * @param {string} text - Text to convert to speech
 * @param {object} options - TTS options
 * @returns {string} Path to generated audio file
 */
export async function generateCharacterSpeech(text, options = {}) {
  const {
    voiceStyle = 'friendly',
    ageLevel = 2,
    characterName = 'character',
    cacheEnabled = true
  } = options

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }

  // Generate cache key
  const cacheKey = crypto
    .createHash('md5')
    .update(`${text}-${voiceStyle}-${ageLevel}`)
    .digest('hex')

  const audioDir = path.join(__dirname, '../../public/uploads/audio')
  const audioPath = path.join(audioDir, `${cacheKey}.mp3`)
  const publicPath = `/uploads/audio/${cacheKey}.mp3`

  // Check cache
  if (cacheEnabled && fs.existsSync(audioPath)) {
    return { audioUrl: publicPath, cached: true }
  }

  // Ensure directory exists
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, { recursive: true })
  }

  // Select voice based on style
  const voice = CHARACTER_VOICES[voiceStyle] || CHARACTER_VOICES.friendly

  // Adjust speed for age level
  const speed = SPEED_BY_AGE_LEVEL[ageLevel] || 1.0

  try {
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice,
      input: text,
      speed
    })

    // Save audio file
    const buffer = Buffer.from(await response.arrayBuffer())
    fs.writeFileSync(audioPath, buffer)

    return { audioUrl: publicPath, cached: false }
  } catch (error) {
    console.error('TTS generation error:', error)
    throw new Error('Failed to generate speech audio')
  }
}

/**
 * Generate vocabulary pronunciation audio
 * @param {string} word - Word to pronounce
 * @param {object} options - TTS options
 * @returns {string} Path to generated audio file
 */
export async function generateVocabularyAudio(word, options = {}) {
  const {
    ageLevel = 2,
    includePhrase = false,
    phrase = null
  } = options

  // For vocabulary, use clear instructional voice
  const voiceStyle = 'clear'

  // For younger learners, pronounce slower
  const text = includePhrase && phrase ? `${word}. ${phrase}` : word

  return generateCharacterSpeech(text, {
    voiceStyle,
    ageLevel,
    cacheEnabled: true
  })
}

/**
 * Generate batch vocabulary audio
 * @param {Array} vocabulary - Array of vocabulary items
 * @param {number} ageLevel - Age level (1-3)
 * @returns {Array} Array of { word, audioUrl }
 */
export async function generateBatchVocabularyAudio(vocabulary, ageLevel = 2) {
  const results = []

  for (const vocab of vocabulary) {
    try {
      const { audioUrl } = await generateVocabularyAudio(vocab.word, {
        ageLevel,
        includePhrase: ageLevel >= 2 && vocab.phraseLevel2,
        phrase: vocab.phraseLevel2
      })

      results.push({
        word: vocab.word,
        audioUrl,
        success: true
      })
    } catch (error) {
      console.error(`Failed to generate audio for "${vocab.word}":`, error)
      results.push({
        word: vocab.word,
        audioUrl: null,
        success: false,
        error: error.message
      })
    }
  }

  return results
}

/**
 * Generate activity narration audio (intro/success messages)
 * @param {string} text - Narration text
 * @param {string} characterVoice - Character's voice style
 * @param {number} ageLevel - Age level (1-3)
 * @returns {object} { audioUrl, cached }
 */
export async function generateNarrationAudio(text, characterVoice = 'friendly', ageLevel = 2) {
  return generateCharacterSpeech(text, {
    voiceStyle: characterVoice,
    ageLevel,
    cacheEnabled: true
  })
}

/**
 * Clear cached audio files older than specified days
 * @param {number} daysOld - Delete files older than this many days
 */
export async function cleanupOldAudio(daysOld = 30) {
  const audioDir = path.join(__dirname, '../../public/uploads/audio')

  if (!fs.existsSync(audioDir)) {
    return { deleted: 0 }
  }

  const files = fs.readdirSync(audioDir)
  const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000
  let deleted = 0

  for (const file of files) {
    const filePath = path.join(audioDir, file)
    const stats = fs.statSync(filePath)

    if (stats.mtimeMs < cutoff) {
      fs.unlinkSync(filePath)
      deleted++
    }
  }

  return { deleted }
}
