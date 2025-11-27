/**
 * Test script to verify OpenAI Whisper API key is working
 * Run with: node test-whisper-api.js
 */

import 'dotenv/config'
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function testWhisperAPI() {
  console.log('\n========================================')
  console.log('  OpenAI Whisper API Key Test')
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

  // Step 3: Create a minimal test audio file (1 second of silence in WAV format)
  // WAV header for 1 second of silence at 16kHz, 16-bit mono
  const testAudioPath = path.join(__dirname, 'test-audio.wav')

  try {
    // Create a minimal valid WAV file with a spoken word using text-to-speech first,
    // then transcribe it back. This tests both TTS and Whisper.
    console.log('Step 1: Testing API connection with text-to-speech...')

    const ttsResponse = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: 'Hello, this is a test.',
    })

    // Save the TTS output
    const buffer = Buffer.from(await ttsResponse.arrayBuffer())
    fs.writeFileSync(testAudioPath, buffer)
    console.log('✅ Text-to-speech API working - generated test audio\n')

    // Step 4: Test Whisper transcription
    console.log('Step 2: Testing Whisper transcription API...')

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(testAudioPath),
      model: 'whisper-1',
      response_format: 'json'
    })

    console.log('✅ Whisper API is working!\n')
    console.log('Transcription result:')
    console.log(`   "${transcription.text}"\n`)

    // Cleanup
    fs.unlinkSync(testAudioPath)
    console.log('✅ Test audio file cleaned up\n')

    console.log('========================================')
    console.log('  All tests PASSED!')
    console.log('  Your OpenAI API key is working correctly')
    console.log('  for the video transcription feature.')
    console.log('========================================\n')

  } catch (error) {
    // Cleanup on error
    if (fs.existsSync(testAudioPath)) {
      fs.unlinkSync(testAudioPath)
    }

    console.log('❌ API Test Failed\n')

    if (error.status === 401) {
      console.log('Error: Invalid API key (401 Unauthorized)')
      console.log('Your API key is not valid or has been revoked.')
      console.log('Please check your OpenAI dashboard and generate a new key.')
    } else if (error.status === 429) {
      console.log('Error: Rate limit exceeded (429)')
      console.log('Your API key has hit rate limits. Please wait and try again.')
    } else if (error.status === 402) {
      console.log('Error: Payment required (402)')
      console.log('Your OpenAI account needs payment method or has exceeded quota.')
    } else if (error.status === 503 || error.status === 502) {
      console.log('Error: OpenAI service unavailable')
      console.log('The OpenAI service is temporarily down. Check status.openai.com')
    } else {
      console.log(`Error: ${error.message}`)
      if (error.status) {
        console.log(`Status code: ${error.status}`)
      }
      if (error.code) {
        console.log(`Error code: ${error.code}`)
      }
    }

    console.log('\nFull error details:')
    console.log(error)
    process.exit(1)
  }
}

testWhisperAPI()
