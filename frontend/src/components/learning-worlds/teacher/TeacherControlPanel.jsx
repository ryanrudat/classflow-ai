import { useState } from 'react'
import { useLearningWorldStore } from '../../../stores/learningWorldStore'

/**
 * Teacher Control Panel
 *
 * Floating control panel for teachers during a Learning World session.
 * Features:
 * - Join code display
 * - Control mode toggle (teacher/student touch)
 * - Age level adjustment
 * - Audio controls
 * - Navigation controls
 * - Session management
 */
export default function TeacherControlPanel({ joinCode, onEndSession }) {
  const storeState = useLearningWorldStore() || {}
  const {
    controlMode = 'teacher',
    ageLevel = 2,
    audioEnabled = true,
    musicEnabled = true,
    currentView = 'world_map',
    worldSession = null,
    setControlMode = () => {},
    setAgeLevel = () => {},
    toggleAudio = () => {},
    toggleMusic = () => {},
    navigateToWorldMap = () => {},
    goBack = () => {}
  } = storeState

  const [isExpanded, setIsExpanded] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 20, y: 100 })

  // Handle dragging
  function handleDragStart(e) {
    setIsDragging(true)
  }

  function handleDrag(e) {
    if (!isDragging) return
    if (e.clientX === 0 && e.clientY === 0) return // Ignore invalid positions

    setPosition({
      x: Math.max(0, e.clientX - 150),
      y: Math.max(0, e.clientY - 20)
    })
  }

  function handleDragEnd() {
    setIsDragging(false)
  }

  // Control mode labels
  const controlModeLabels = {
    teacher: 'Teacher Only',
    student_touch: 'Student Touch',
    hybrid: 'Hybrid'
  }

  // Age level labels
  const ageLevelLabels = {
    1: '4-6 yrs',
    2: '7-8 yrs',
    3: '9-10 yrs'
  }

  return (
    <div
      className={`fixed z-50 transition-all duration-300 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{ left: position.x, top: position.y }}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
    >
      {/* Collapsed State */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      )}

      {/* Expanded Panel */}
      {isExpanded && (
        <div className="bg-white rounded-2xl shadow-xl w-72 overflow-hidden">
          {/* Header (draggable) */}
          <div
            className="bg-gradient-to-r from-sky-500 to-sky-600 px-4 py-3 flex items-center justify-between cursor-grab active:cursor-grabbing"
            draggable
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              </svg>
              <span className="font-semibold text-white">Teacher Controls</span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Join Code */}
            {joinCode && (
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3 text-center">
                <p className="text-xs text-emerald-600 font-medium mb-1">JOIN CODE</p>
                <p className="text-2xl font-mono font-bold text-emerald-700 tracking-wider">
                  {joinCode}
                </p>
              </div>
            )}

            {/* Control Mode Toggle */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">
                CONTROL MODE
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setControlMode('teacher')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    controlMode === 'teacher'
                      ? 'bg-sky-100 text-sky-700 border-2 border-sky-300'
                      : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                  }`}
                >
                  Teacher Only
                </button>
                <button
                  onClick={() => setControlMode('student_touch')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    controlMode === 'student_touch'
                      ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300'
                      : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                  }`}
                >
                  Student Touch
                </button>
              </div>
            </div>

            {/* Age Level */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">
                AGE LEVEL
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[1, 2, 3].map(level => (
                  <button
                    key={level}
                    onClick={() => setAgeLevel(level)}
                    className={`px-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                      ageLevel === level
                        ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                        : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                    }`}
                  >
                    {ageLevelLabels[level]}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleAudio}
                  className={`p-2 rounded-lg transition-colors ${
                    audioEnabled ? 'bg-sky-100 text-sky-600' : 'bg-gray-100 text-gray-400'
                  }`}
                  title={audioEnabled ? 'Mute Audio' : 'Enable Audio'}
                >
                  {audioEnabled ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={toggleMusic}
                  className={`p-2 rounded-lg transition-colors ${
                    musicEnabled ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'
                  }`}
                  title={musicEnabled ? 'Mute Music' : 'Enable Music'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </button>
              </div>
              <span className="text-xs text-gray-400">Audio</span>
            </div>

            {/* Navigation */}
            <div className="flex gap-2">
              <button
                onClick={goBack}
                className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
              <button
                onClick={navigateToWorldMap}
                className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Map
              </button>
            </div>

            {/* End Session */}
            <button
              onClick={onEndSession}
              className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors border border-red-200"
            >
              End Session
            </button>
          </div>

          {/* Current View Indicator */}
          <div className="bg-gray-50 px-4 py-2 border-t text-xs text-gray-500 text-center">
            View: {currentView.replace(/_/g, ' ')}
          </div>
        </div>
      )}
    </div>
  )
}
