import { useState, useEffect } from 'react'
import { presentationAPI } from '../../services/api'
import { useSocket } from '../../hooks/useSocket'

/**
 * PresentationControls - Teacher controls for managing live presentations
 * Handles mode switching, navigation, checkpoints, and student monitoring
 */
export default function PresentationControls({ deck, currentSlideNumber, onNavigate }) {
  const [mode, setMode] = useState('student')
  const [checkpoints, setCheckpoints] = useState([])
  const [studentProgress, setStudentProgress] = useState([])
  const [showStudentPanel, setShowStudentPanel] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const { on, off, emit } = useSocket()

  const totalSlides = deck?.slides?.length || 0

  useEffect(() => {
    if (!deck?.id) return

    loadStudentProgress()

    // Listen for student progress updates
    const handleStudentSlideChanged = ({ studentId, slideNumber }) => {
      setStudentProgress(prev =>
        prev.map(s =>
          s.studentId === studentId ? { ...s, currentSlide: slideNumber } : s
        )
      )
    }

    const handleStudentSlideCompleted = ({ studentId, slideId }) => {
      setStudentProgress(prev =>
        prev.map(s =>
          s.studentId === studentId
            ? { ...s, completedSlides: [...(s.completedSlides || []), slideId] }
            : s
        )
      )
    }

    const handleUserJoined = ({ studentId, studentName, role }) => {
      if (role === 'student') {
        // Reload student progress to include new student
        loadStudentProgress()
      }
    }

    const handleUserLeft = ({ studentId, role }) => {
      if (role === 'student') {
        // Remove student from progress list
        setStudentProgress(prev => prev.filter(s => s.studentId !== studentId))
      }
    }

    on('student-slide-changed', handleStudentSlideChanged)
    on('student-slide-completed', handleStudentSlideCompleted)
    on('user-joined', handleUserJoined)
    on('user-left', handleUserLeft)

    return () => {
      off('student-slide-changed', handleStudentSlideChanged)
      off('student-slide-completed', handleStudentSlideCompleted)
      off('user-joined', handleUserJoined)
      off('user-left', handleUserLeft)
    }
  }, [deck?.id, on, off])

  const loadStudentProgress = async () => {
    if (!deck?.id) return

    try {
      const result = await presentationAPI.getProgress(deck.id)
      setStudentProgress(result.students || [])
    } catch (err) {
      console.error('Failed to load student progress:', err)
    }
  }

  const handleModeChange = async (newMode) => {
    setIsLoading(true)
    try {
      await presentationAPI.changeMode(deck.id, newMode)
      setMode(newMode)

      // Emit mode change event
      emit('mode-changed', { mode: newMode })
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to change mode')
    } finally {
      setIsLoading(false)
    }
  }

  const handleNavigate = async (slideNumber) => {
    // Allow navigation in all modes, but only broadcast in teacher mode
    onNavigate(slideNumber)

    if (mode === 'teacher') {
      try {
        await presentationAPI.navigate(deck.id, slideNumber)
        // Broadcast to students
        emit('teacher-navigated', { slideNumber })
      } catch (err) {
        console.error('Failed to broadcast navigation:', err)
      }
    }
  }

  const handleNext = () => {
    const nextSlide = Math.min(currentSlideNumber + 1, totalSlides)
    handleNavigate(nextSlide)
  }

  const handlePrevious = () => {
    const prevSlide = Math.max(currentSlideNumber - 1, 1)
    handleNavigate(prevSlide)
  }

  const handleToggleCheckpoint = async (slideNumber) => {
    const newCheckpoints = checkpoints.includes(slideNumber)
      ? checkpoints.filter(s => s !== slideNumber)
      : [...checkpoints, slideNumber]

    try {
      await presentationAPI.setCheckpoints(deck.id, newCheckpoints)
      setCheckpoints(newCheckpoints)

      // Broadcast checkpoint update
      emit('checkpoints-updated', { checkpoints: newCheckpoints })
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update checkpoints')
    }
  }

  const getStudentProgressColor = (student) => {
    const currentSlide = student.currentSlideNumber || student.currentSlide || 1
    const progress = (currentSlide / totalSlides) * 100
    if (progress < 30) return 'bg-red-100 text-red-700'
    if (progress < 70) return 'bg-yellow-100 text-yellow-700'
    return 'bg-green-100 text-green-700'
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        {/* Main controls */}
        <div className="flex items-center justify-between mb-4">
          {/* Navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevious}
              disabled={currentSlideNumber === 1}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>

            <div className="px-4 py-2 bg-blue-50 text-blue-900 rounded-lg font-medium">
              Slide {currentSlideNumber} / {totalSlides}
            </div>

            <button
              onClick={handleNext}
              disabled={currentSlideNumber === totalSlides}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>

          {/* Mode selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Mode:</span>
            <button
              onClick={() => handleModeChange('teacher')}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg transition-colors ${
                mode === 'teacher'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🔒 Teacher-Paced
            </button>
            <button
              onClick={() => handleModeChange('student')}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg transition-colors ${
                mode === 'student'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🟢 Student-Paced
            </button>
            <button
              onClick={() => handleModeChange('bounded')}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg transition-colors ${
                mode === 'bounded'
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ⚡ Bounded
            </button>
          </div>

          {/* Student progress toggle */}
          <button
            onClick={() => setShowStudentPanel(!showStudentPanel)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showStudentPanel ? 'Hide' : 'Show'} Students ({studentProgress.length})
          </button>
        </div>

        {/* Checkpoint controls (bounded mode) */}
        {mode === 'bounded' && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="font-medium text-amber-900 mb-2">Checkpoint Slides</h3>
            <div className="flex flex-wrap gap-2">
              {deck.slides.map((slide, index) => {
                const slideNum = index + 1
                const isCheckpoint = checkpoints.includes(slideNum)
                return (
                  <button
                    key={slide.id}
                    onClick={() => handleToggleCheckpoint(slideNum)}
                    className={`px-3 py-1 rounded transition-colors ${
                      isCheckpoint
                        ? 'bg-amber-600 text-white'
                        : 'bg-white border border-amber-300 text-amber-700 hover:bg-amber-100'
                    }`}
                  >
                    {slideNum}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-amber-700 mt-2">
              Click slide numbers to set checkpoints where students must wait for the class
            </p>
          </div>
        )}

        {/* Student progress panel */}
        {showStudentPanel && (
          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-medium text-gray-900 mb-3">Student Progress</h3>
            <div className="grid grid-cols-4 gap-3 max-h-48 overflow-y-auto">
              {studentProgress.map((student) => (
                <div
                  key={student.studentId}
                  className={`p-3 rounded-lg ${getStudentProgressColor(student)}`}
                >
                  <div className="font-medium truncate">{student.name}</div>
                  <div className="text-sm">
                    Slide {student.currentSlideNumber || student.currentSlide || 1} / {totalSlides}
                  </div>
                  <div className="w-full bg-white bg-opacity-50 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-current h-1.5 rounded-full transition-all"
                      style={{
                        width: `${((student.currentSlideNumber || student.currentSlide || 1) / totalSlides) * 100}%`
                      }}
                    />
                  </div>
                </div>
              ))}

              {studentProgress.length === 0 && (
                <div className="col-span-4 text-center py-8 text-gray-500">
                  No students connected yet
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
