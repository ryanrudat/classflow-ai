/**
 * Test script to verify OpenAI Whisper API key is working
 * Tests BOTH methods used in the codebase:
 * 1. OpenAI SDK (used by reverse tutoring)
 * 2. Axios with verbose_json (used by video transcription for timestamps)
 *
 * Run with: node test-whisper-api.js
 */

import 'dotenv/config'
import OpenAI from 'openai'
import axios from 'axios'
import FormData from 'form-data'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function testWhisperAPI() {
  console.log('\n========================================')
  console.log('  OpenAI Whisper API Test')
  console.log('  (Video Upload Transcription)')
  console.log('========================================\n')

  // Step 1: Check if API key is configured
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    console.log('❌ OPENAI_API_KEY is NOT configured in environment variables')
    console.log('\nTo fix this:')
    console.log('1. Create a .env file in the backend directory')
    console.log('2. Add: OPENAI_API_KEY=sk-your-api-key-here')
    console.log('3. Or set the environment variable directly')
    process.exit(1)
  }

  console.log('✅ OPENAI_API_KEY is configured')
  console.log(`   Key prefix: ${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`)
  console.log(`   Key length: ${apiKey.length} characters\n`)

  // Step 2: Initialize OpenAI client
  const openai = new OpenAI({ apiKey })

  const testAudioPath = path.join(__dirname, 'test-audio.mp3')

  try {
    // Generate test audio using text-to-speech
    console.log('Step 1: Generating test audio with TTS...')

    const ttsResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: 'Welcome to the lesson. Today we will learn about science. This is an important topic.',
    })

    const buffer = Buffer.from(await ttsResponse.arrayBuffer())
    fs.writeFileSync(testAudioPath, buffer)
    console.log('✅ Test audio generated (simulates video audio track)\n')

    // Test 1: OpenAI SDK method (used by reverse tutoring)
    console.log('Step 2: Testing Whisper via OpenAI SDK...')
    console.log('   (This is how reverse tutoring works)')

    const sdkTranscription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(testAudioPath),
      model: 'whisper-1',
      response_format: 'json'
    })

    console.log('✅ OpenAI SDK method works!')
    console.log(`   Text: "${sdkTranscription.text}"\n`)

    // Test 2: Axios method with verbose_json (used by video transcription)
    console.log('Step 3: Testing Whisper via Axios with timestamps...')
    console.log('   (This is how video transcription works)')

    const formData = new FormData()
    formData.append('file', fs.createReadStream(testAudioPath), {
      filename: 'test-video.mp3',
      contentType: 'audio/mpeg'
    })
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'verbose_json')  // Get timestamps!

    const axiosResponse = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          ...formData.getHeaders()
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        timeout: 60000
      }
    )

    const transcriptData = axiosResponse.data

    console.log('✅ Axios method works with timestamps!')
    console.log(`   Full text: "${transcriptData.text}"`)
    console.log(`   Language: ${transcriptData.language}`)
    console.log(`   Duration: ${transcriptData.duration}s`)

    if (transcriptData.segments && transcriptData.segments.length > 0) {
      console.log(`   Segments: ${transcriptData.segments.length}`)
      console.log('\n   Timestamp segments (for AI question placement):')
      transcriptData.segments.forEach((seg, i) => {
        console.log(`   [${seg.start.toFixed(1)}s - ${seg.end.toFixed(1)}s] ${seg.text.trim()}`)
      })
    }

    // Cleanup
    fs.unlinkSync(testAudioPath)
    console.log('\n✅ Test audio cleaned up')

    console.log('\n========================================')
    console.log('  ALL TESTS PASSED!')
    console.log('========================================')
    console.log('  ✅ OpenAI API key is valid')
    console.log('  ✅ Whisper transcription works')
    console.log('  ✅ Timestamp generation works')
    console.log('')
    console.log('  Video upload transcription is ready!')
    console.log('  AI can generate timestamped questions.')
    console.log('========================================\n')

  } catch (error) {
    // Cleanup on error
    if (fs.existsSync(testAudioPath)) {
      fs.unlinkSync(testAudioPath)
    }

    console.log('❌ API Test Failed\n')

    const status = error.status || error.response?.status

    if (status === 401) {
      console.log('Error: Invalid API key (401 Unauthorized)')
      console.log('Your API key is not valid or has been revoked.')
      console.log('Please check your OpenAI dashboard and generate a new key.')
    } else if (status === 429) {
      console.log('Error: Rate limit exceeded (429)')
      console.log('Your API key has hit rate limits. Please wait and try again.')
    } else if (status === 402) {
      console.log('Error: Payment required (402)')
      console.log('Your OpenAI account needs payment method or has exceeded quota.')
    } else if (status === 503 || status === 502) {
      console.log('Error: OpenAI service unavailable')
      console.log('The OpenAI service is temporarily down. Check status.openai.com')
    } else {
      console.log(`Error: ${error.message}`)
      if (status) {
        console.log(`Status code: ${status}`)
      }
      if (error.code) {
        console.log(`Error code: ${error.code}`)
      }
    }

    console.log('\nFull error details:')
    console.log(error.response?.data || error)
    process.exit(1)
  }
}

testWhisperAPI()
