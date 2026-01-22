import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useLearningWorldStore } from '../stores/learningWorldStore'
import { useLearningWorldSocket } from '../hooks/useLearningWorldSocket'
import { useAudioManager } from '../hooks/useAudioManager'
import WorldMapView from '../components/learning-worlds/WorldMapView'
import LandView from '../components/learning-worlds/LandView'
import ActivityPlayer from '../components/learning-worlds/ActivityPlayer'
import TeacherControlPanel from '../components/learning-worlds/teacher/TeacherControlPanel'
import { LoadingSpinner } from '../components/LoadingStates'
import { useNotifications } from '../components/Toast'

/**
 * Learning World Player
 *
 * The main live teaching/learning view for Learning Worlds.
 * Handles navigation between world map, lands, and activities.
 */
export default function LearningWorldPlayer() {
  const { worldId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { notifySuccess, notifyError } = useNotifications()

  // Get store state with defaults to prevent destructuring errors
  const storeState = useLearningWorldStore() || {}
  const {
    currentWorld = null,
    currentLand = null,
    currentActivity = null,
    currentView = 'world_map',
    worldSession = null,
    sessionId = null,
    joinCode = null,
    controlMode = 'teacher',
    ageLevel = 2,
    isTeacher = true,
    loading = false,
    error = null,
    fetchWorld = async () => ({ success: false }),
    startSession = async () => ({ success: false }),
    endSession = async () => ({ success: false }),
    navigateToWorldMap = () => {},
    navigateToLand = () => {},
    navigateToActivity = () => {},
    goBack = () => {},
    setAgeLevel = () => {}
  } = storeState

  // Socket connection for real-time sync
  const socketState = useLearningWorldSocket(sessionId) || {}
  const { isConnected = false } = socketState

  // Audio manager
  const audioManager = useAudioManager() || {}
  const { playMusic, stopMusic, playSuccess } = audioManager

  // Session start modal
  const [showStartModal, setShowStartModal] = useState(false)
  const [startOptions, setStartOptions] = useState({
    ageLevel: 2,
    controlMode: 'student_touch',  // Default to interactive mode
    audioEnabled: true,
    musicEnabled: true
  })

  // Load world data
  useEffect(() => {
    if (worldId) {
      fetchWorld(worldId)
    }
  }, [worldId])

  // Auto-start session or show start modal
  useEffect(() => {
    if (currentWorld && !worldSession) {
      setShowStartModal(true)
    }
  }, [currentWorld, worldSession])

  async function handleStartSession() {
    try {
      const result = await startSession(worldId, startOptions)
      if (result.success) {
        // Refresh world data to ensure we have latest lands
        const worldResult = await fetchWorld(worldId)

        if (!worldResult.success) {
          notifyError('Failed to load world data')
          return
        }

        setShowStartModal(false)
        notifySuccess('Session started!')

        // Background music is disabled until audio files are added
        // To enable: add world-theme.mp3 to /public/audio/music/
        // if (startOptions.musicEnabled) {
        //   playMusic('/audio/music/world-theme.mp3')
        // }
      } else {
        notifyError(result.error || 'Failed to start session')
      }
    } catch (err) {
      console.error('Session start error:', err)
      notifyError('Failed to start session: ' + (err.message || 'Unknown error'))
    }
  }

  async function handleEndSession() {
    if (!window.confirm('End this Learning World session?')) return

    stopMusic()
    const result = await endSession()
    if (result.success) {
      navigate('/worlds')
    }
  }

  function handleActivityComplete(activityId, result) {
    playSuccess()
    // Navigate back to land view
    goBack()
  }

  // Loading state
  if (loading && !currentWorld) {
    return (
      <div className="min-h-screen bg-sky-100 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600">Loading world...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-sky-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Something went wrong</h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => navigate('/worlds')}
            className="px-6 py-2 bg-sky-500 text-white rounded-lg"
          >
            Back to Worlds
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 top-16 bg-sky-100 overflow-hidden">
      {/* Main Content Area - accounts for navigation */}
      <div className="w-full h-full">
        {currentView === 'world_map' && currentWorld && (
          <WorldMapView
            world={currentWorld}
            onSelectLand={navigateToLand}
            ageLevel={ageLevel}
          />
        )}

        {currentView === 'land_view' && currentLand && (
          <LandView
            land={currentLand}
            onSelectActivity={navigateToActivity}
            onBack={navigateToWorldMap}
            ageLevel={ageLevel}
          />
        )}

        {currentView === 'activity' && currentActivity && (
          <ActivityPlayer
            activity={currentActivity}
            ageLevel={ageLevel}
            controlMode={controlMode}
            onComplete={handleActivityComplete}
            onBack={goBack}
          />
        )}

        {/* Fallback when no content to show */}
        {!currentWorld && !loading && worldSession && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="bg-white rounded-2xl p-8 max-w-md text-center shadow-lg">
              <div className="text-6xl mb-4">🔄</div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Loading World...</h2>
              <p className="text-gray-500 mb-4">Please wait while we load your learning world.</p>
              <button
                onClick={() => fetchWorld(worldId)}
                className="px-6 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600"
              >
                Reload
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Teacher Control Panel */}
      {isTeacher && worldSession && (
        <TeacherControlPanel
          joinCode={joinCode}
          controlMode={controlMode}
          ageLevel={ageLevel}
          onEndSession={handleEndSession}
        />
      )}

      {/* Connection Status */}
      {!isConnected && worldSession && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full text-sm flex items-center gap-2 z-50">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          Reconnecting...
        </div>
      )}

      {/* Start Session Modal */}
      {showStartModal && currentWorld && (
        <StartSessionModal
          world={currentWorld}
          options={startOptions}
          onOptionsChange={setStartOptions}
          onStart={handleStartSession}
          onCancel={() => navigate('/worlds')}
        />
      )}
    </div>
  )
}

/**
 * Start Session Modal
 */
function StartSessionModal({ world, options, onOptionsChange, onStart, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Start Learning Session</h2>
        <p className="text-gray-500 mb-6">Configure the session for your students</p>

        <div className="space-y-6">
          {/* World Preview */}
          <div className="flex items-center gap-4 p-4 bg-sky-50 rounded-xl">
            <div className="w-16 h-16 bg-sky-200 rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">{world.name}</h3>
              <p className="text-sm text-gray-500">{world.land_count || 0} lands</p>
            </div>
          </div>

          {/* Age Level Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Student Age Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { level: 1, label: 'Ages 4-6', desc: 'Simple words' },
                { level: 2, label: 'Ages 7-8', desc: 'Phrases' },
                { level: 3, label: 'Ages 9-10', desc: 'Sentences' }
              ].map(({ level, label, desc }) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => onOptionsChange({ ...options, ageLevel: level })}
                  className={`p-3 rounded-lg border-2 transition-colors text-left ${
                    options.ageLevel === level
                      ? 'border-sky-500 bg-sky-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="block font-medium text-gray-800">{label}</span>
                  <span className="text-xs text-gray-500">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Control Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Control Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onOptionsChange({ ...options, controlMode: 'teacher' })}
                className={`p-3 rounded-lg border-2 transition-colors text-left ${
                  options.controlMode === 'teacher'
                    ? 'border-sky-500 bg-sky-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="block font-medium text-gray-800">Teacher Only</span>
                <span className="text-xs text-gray-500">You control navigation</span>
              </button>
              <button
                type="button"
                onClick={() => onOptionsChange({ ...options, controlMode: 'student_touch' })}
                className={`p-3 rounded-lg border-2 transition-colors text-left ${
                  options.controlMode === 'student_touch'
                    ? 'border-sky-500 bg-sky-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="block font-medium text-gray-800">Student Touch</span>
                <span className="text-xs text-gray-500">Students can interact</span>
              </button>
            </div>
          </div>

          {/* Audio Settings */}
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-gray-800">Background Music</span>
              <p className="text-xs text-gray-500">Gentle ambient sounds</p>
            </div>
            <button
              type="button"
              onClick={() => onOptionsChange({ ...options, musicEnabled: !options.musicEnabled })}
              className={`w-12 h-6 rounded-full transition-colors ${
                options.musicEnabled ? 'bg-sky-500' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  options.musicEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-8">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onStart}
            className="px-6 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
          >
            Start Session
          </button>
        </div>
      </div>
    </div>
  )
}
