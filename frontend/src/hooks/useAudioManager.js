import { useRef, useCallback, useEffect, useState } from 'react'
import { useLearningWorldStore } from '../stores/learningWorldStore'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/**
 * Audio Manager Hook for Learning Worlds
 *
 * Manages all audio playback:
 * - Character voices (narration)
 * - Vocabulary pronunciation
 * - Sound effects (tap, success, error, celebration)
 * - Background music
 */
export function useAudioManager() {
  // Get audio settings from store with defaults
  const audioEnabled = useLearningWorldStore(state => state.audioEnabled ?? true)
  const musicEnabled = useLearningWorldStore(state => state.musicEnabled ?? true)
  const volumeLevel = useLearningWorldStore(state => state.volumeLevel ?? 80)

  // Audio element refs
  const voiceRef = useRef(null)
  const effectRef = useRef(null)
  const musicRef = useRef(null)

  // State
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentAudio, setCurrentAudio] = useState(null)

  // Preloaded sound effects
  const soundEffects = useRef({
    tap: null,
    success: null,
    error: null,
    celebration: null,
    pop: null,
    whoosh: null,
    star: null
  })

  // Initialize audio elements
  useEffect(() => {
    voiceRef.current = new Audio()
    effectRef.current = new Audio()
    musicRef.current = new Audio()

    // Set music to loop
    musicRef.current.loop = true

    // Sound effects are disabled until audio files are added
    // To enable, add mp3 files to /public/audio/effects/
    // and uncomment the preloading code below
    /*
    const effects = {
      tap: '/audio/effects/tap.mp3',
      success: '/audio/effects/success.mp3',
      error: '/audio/effects/error.mp3',
      celebration: '/audio/effects/celebration.mp3',
      pop: '/audio/effects/pop.mp3',
      whoosh: '/audio/effects/whoosh.mp3',
      star: '/audio/effects/star.mp3'
    }

    Object.entries(effects).forEach(([name, path]) => {
      const audio = new Audio()
      audio.preload = 'auto'
      audio.onerror = () => {
        soundEffects.current[name] = null
      }
      audio.src = path
      soundEffects.current[name] = audio
    })
    */

    return () => {
      voiceRef.current?.pause()
      effectRef.current?.pause()
      musicRef.current?.pause()
    }
  }, [])

  // Update volume when settings change
  useEffect(() => {
    const volume = volumeLevel / 100

    if (voiceRef.current) voiceRef.current.volume = volume
    if (effectRef.current) effectRef.current.volume = volume
    if (musicRef.current) musicRef.current.volume = volume * 0.3 // Music quieter

    // Update preloaded effects
    Object.values(soundEffects.current).forEach(audio => {
      if (audio) audio.volume = volume
    })
  }, [volumeLevel])

  // Handle music enable/disable
  useEffect(() => {
    if (musicRef.current) {
      if (musicEnabled) {
        // Don't auto-play, just allow play when called
      } else {
        musicRef.current.pause()
      }
    }
  }, [musicEnabled])

  /**
   * Play character voice/narration
   */
  const playVoice = useCallback((audioUrl, onEnd = null) => {
    if (!audioEnabled || !voiceRef.current) return

    voiceRef.current.pause()

    // Handle both relative and absolute URLs
    const fullUrl = audioUrl.startsWith('http') ? audioUrl : `${API_URL}${audioUrl}`

    voiceRef.current.src = fullUrl
    voiceRef.current.volume = volumeLevel / 100

    if (onEnd) {
      voiceRef.current.onended = onEnd
    }

    voiceRef.current.play().catch(err => {
      console.error('Voice playback error:', err)
    })

    setIsPlaying(true)
    setCurrentAudio('voice')
  }, [audioEnabled, volumeLevel])

  /**
   * Play vocabulary pronunciation
   */
  const playWord = useCallback((audioUrl, onEnd = null) => {
    if (!audioEnabled || !voiceRef.current) return

    voiceRef.current.pause()

    const fullUrl = audioUrl.startsWith('http') ? audioUrl : `${API_URL}${audioUrl}`

    voiceRef.current.src = fullUrl
    voiceRef.current.volume = volumeLevel / 100

    if (onEnd) {
      voiceRef.current.onended = onEnd
    }

    voiceRef.current.play().catch(err => {
      console.error('Word playback error:', err)
    })

    setIsPlaying(true)
    setCurrentAudio('word')
  }, [audioEnabled, volumeLevel])

  /**
   * Play a sound effect
   */
  const playEffect = useCallback((effectName) => {
    if (!audioEnabled) return

    const effect = soundEffects.current[effectName]
    if (effect && effect.readyState >= 2) { // HAVE_CURRENT_DATA or better
      effect.currentTime = 0
      effect.volume = volumeLevel / 100
      effect.play().catch(() => {
        // Silently ignore - audio file may not exist
      })
    }
  }, [audioEnabled, volumeLevel])

  /**
   * Convenience methods for common effects
   */
  const playTap = useCallback(() => playEffect('tap'), [playEffect])
  const playSuccess = useCallback(() => playEffect('success'), [playEffect])
  const playError = useCallback(() => playEffect('error'), [playEffect])
  const playCelebration = useCallback(() => playEffect('celebration'), [playEffect])
  const playPop = useCallback(() => playEffect('pop'), [playEffect])
  const playStar = useCallback(() => playEffect('star'), [playEffect])

  /**
   * Play background music
   */
  const playMusic = useCallback((musicUrl) => {
    if (!musicEnabled || !musicRef.current) return

    const fullUrl = musicUrl.startsWith('http') ? musicUrl : `${API_URL}${musicUrl}`

    musicRef.current.src = fullUrl
    musicRef.current.volume = (volumeLevel / 100) * 0.3 // Music at 30% of main volume
    musicRef.current.play().catch(err => {
      console.error('Music playback error:', err)
    })
  }, [musicEnabled, volumeLevel])

  /**
   * Stop background music
   */
  const stopMusic = useCallback(() => {
    if (musicRef.current) {
      musicRef.current.pause()
      musicRef.current.currentTime = 0
    }
  }, [])

  /**
   * Pause all audio
   */
  const pauseAll = useCallback(() => {
    voiceRef.current?.pause()
    effectRef.current?.pause()
    musicRef.current?.pause()
    setIsPlaying(false)
    setCurrentAudio(null)
  }, [])

  /**
   * Stop voice/narration
   */
  const stopVoice = useCallback(() => {
    if (voiceRef.current) {
      voiceRef.current.pause()
      voiceRef.current.currentTime = 0
    }
    setIsPlaying(false)
    setCurrentAudio(null)
  }, [])

  /**
   * Play a sequence of audio files
   */
  const playSequence = useCallback((audioUrls, onComplete = null) => {
    if (!audioEnabled || audioUrls.length === 0) {
      onComplete?.()
      return
    }

    let currentIndex = 0

    const playNext = () => {
      if (currentIndex >= audioUrls.length) {
        onComplete?.()
        return
      }

      playVoice(audioUrls[currentIndex], () => {
        currentIndex++
        playNext()
      })
    }

    playNext()
  }, [audioEnabled, playVoice])

  /**
   * Speak text using TTS (requires backend call)
   */
  const speakText = useCallback(async (text, options = {}) => {
    if (!audioEnabled) return

    const { voiceStyle = 'friendly', ageLevel = 2 } = options

    try {
      const response = await fetch(`${API_URL}/api/world-audio/generate-tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceStyle, ageLevel })
      })

      if (!response.ok) throw new Error('TTS generation failed')

      const data = await response.json()
      playVoice(data.audioUrl)
    } catch (error) {
      console.error('TTS error:', error)
    }
  }, [audioEnabled, playVoice])

  return {
    // Voice/narration
    playVoice,
    playWord,
    stopVoice,
    speakText,
    playSequence,

    // Sound effects
    playEffect,
    playTap,
    playSuccess,
    playError,
    playCelebration,
    playPop,
    playStar,

    // Background music
    playMusic,
    stopMusic,

    // Controls
    pauseAll,

    // State
    isPlaying,
    currentAudio,
    audioEnabled,
    musicEnabled,
    volumeLevel
  }
}
