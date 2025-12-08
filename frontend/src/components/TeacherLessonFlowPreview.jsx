import { useState, useRef } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/**
 * TeacherLessonFlowPreview Component
 * Full-screen preview showing exactly what students see during a lesson flow
 */
export default function TeacherLessonFlowPreview({ flow, activities, onClose }) {
  const videoRef = useRef(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const currentActivity = activities[currentIndex]
  const totalActivities = activities.length
  const progress = {
    currentSequence: currentIndex + 1,
    totalItems: totalActivities
  }

  const handleNext = () => {
    if (currentIndex < totalActivities - 1) {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1)
        setTimeout(() => setIsTransitioning(false), 300)
      }, 300)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex(currentIndex - 1)
        setTimeout(() => setIsTransitioning(false), 300)
      }, 300)
    }
  }

  const handleJumpTo = (index) => {
    if (index !== currentIndex) {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex(index)
        setTimeout(() => setIsTransitioning(false), 300)
      }, 300)
    }
  }

  // Render activity content based on type
  const renderActivityContent = () => {
    if (!currentActivity) return null

    const content = typeof currentActivity.content === 'string'
      ? JSON.parse(currentActivity.content)
      : currentActivity.content

    switch (currentActivity.type) {
      case 'reading':
        return (
          <div className="space-y-4">
            <div className="prose prose-lg max-w-none">
              <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {typeof content === 'string' ? content : JSON.stringify(content)}
              </p>
            </div>
            <div className="pt-4 border-t">
              <button
                disabled
                className="w-full py-3 bg-gray-300 text-gray-500 rounded-lg font-medium cursor-not-allowed"
              >
                Mark as Complete (Preview Mode)
              </button>
            </div>
          </div>
        )

      case 'questions':
      case 'quiz':
        const questions = content?.questions || content?.quiz || []
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">
                {questions.length} question{questions.length !== 1 ? 's' : ''} in this {currentActivity.type}
              </span>
            </div>
            {questions.map((q, idx) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-lg border">
                <p className="font-medium text-gray-800 mb-3">
                  {idx + 1}. {q.question}
                </p>
                {q.options && (
                  <div className="space-y-2 ml-4">
                    {q.options.map((option, i) => (
                      <label key={i} className={`flex items-center p-3 rounded-lg border-2 ${
                        i === q.correct
                          ? 'border-green-400 bg-green-50'
                          : 'border-gray-200 bg-white'
                      }`}>
                        <input type="radio" disabled className="mr-3" checked={i === q.correct} readOnly />
                        <span>{String.fromCharCode(65 + i)}. {option}</span>
                        {i === q.correct && (
                          <span className="ml-auto text-green-600 text-sm font-medium">Correct Answer</span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
                {q.sampleAnswer && (
                  <div className="mt-3 ml-4 p-3 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm font-medium text-blue-700">Sample Answer:</p>
                    <p className="text-sm text-blue-600">{q.sampleAnswer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )

      case 'discussion':
        const prompts = Array.isArray(content) ? content : content?.prompts || []
        return (
          <div className="space-y-4">
            <p className="text-gray-600 mb-4">Students will discuss these prompts:</p>
            {prompts.map((prompt, idx) => (
              <div key={idx} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  <p className="text-gray-800">{prompt}</p>
                </div>
              </div>
            ))}
          </div>
        )

      case 'poll':
        return (
          <div className="space-y-4">
            <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">{content?.question}</h4>
              {content?.options && (
                <div className="space-y-2">
                  {content.options.map((option, i) => (
                    <div key={i} className="p-3 bg-white rounded border border-gray-200 flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                      <span>{option}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 text-center">Students will vote on this poll</p>
          </div>
        )

      case 'video':
      case 'interactive_video':
        const videoUrl = content?.videoUrl || content?.video_url || content?.url
        return (
          <div className="space-y-4">
            {videoUrl ? (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  src={videoUrl.startsWith('http') ? videoUrl : `${API_URL}${videoUrl}`}
                  controls
                  className="w-full h-full object-contain"
                  playsInline
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            ) : (
              <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                <div className="text-center text-white">
                  <svg className="w-20 h-20 mx-auto mb-4 opacity-50" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  <p className="text-lg font-medium">{currentActivity.prompt || 'Video'}</p>
                  <p className="text-sm text-gray-400 mt-2">No video URL found</p>
                </div>
              </div>
            )}
            {currentActivity.type === 'interactive_video' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700 text-center">
                  This video has interactive questions. Students will see questions appear at specific timestamps.
                </p>
              </div>
            )}
          </div>
        )

      case 'sentence_ordering':
        const sentences = content?.sentences || []
        return (
          <div className="space-y-4">
            <p className="text-gray-600 mb-4">Students will arrange these sentences in the correct order:</p>
            <div className="space-y-2">
              {sentences.map((sentence, idx) => (
                <div key={idx} className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 flex items-center gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  <p className="text-gray-800">{typeof sentence === 'string' ? sentence : sentence.text}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 text-center">
              Showing correct order - students will see these shuffled
            </p>
          </div>
        )

      case 'matching':
        const pairs = content?.pairs || []
        return (
          <div className="space-y-4">
            <p className="text-gray-600 mb-4">Students will match these pairs:</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h5 className="font-semibold text-gray-700 text-center pb-2 border-b">Terms</h5>
                {pairs.map((pair, idx) => (
                  <div key={idx} className="p-3 bg-blue-50 rounded border border-blue-200 text-center">
                    {pair.left || pair.term}
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <h5 className="font-semibold text-gray-700 text-center pb-2 border-b">Definitions</h5>
                {pairs.map((pair, idx) => (
                  <div key={idx} className="p-3 bg-green-50 rounded border border-green-200 text-center">
                    {pair.right || pair.definition}
                  </div>
                ))}
              </div>
            </div>
            <p className="text-sm text-gray-500 text-center">
              Showing matched pairs - students will see definitions shuffled
            </p>
          </div>
        )

      default:
        return (
          <div className="p-6 bg-gray-50 rounded-lg">
            <p className="text-gray-600 mb-4">Activity content:</p>
            <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-white p-4 rounded border">
              {JSON.stringify(content, null, 2)}
            </pre>
          </div>
        )
    }
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'quiz': return '📝'
      case 'questions': return '❓'
      case 'reading': return '📖'
      case 'discussion': return '💬'
      case 'sentence_ordering': return '📋'
      case 'matching': return '🎯'
      case 'poll': return '📊'
      case 'video': return '🎥'
      case 'interactive_video': return '🎬'
      default: return '📄'
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-purple-50 to-blue-50 overflow-hidden">
      {/* Teacher Preview Banner */}
      <div className="bg-orange-500 text-white text-center py-2 px-4 text-sm font-medium">
        TEACHER PREVIEW MODE - This is what students will see
        <button
          onClick={onClose}
          className="ml-4 px-3 py-1 bg-white text-orange-600 rounded text-xs font-bold hover:bg-orange-100"
        >
          Exit Preview
        </button>
      </div>

      {/* Progress Bar - Same as student view */}
      <div className="sticky top-0 z-50 bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Progress Stats */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✨</span>
              <div>
                <h2 className="font-bold text-gray-900">{flow.title}</h2>
                <p className="text-sm text-gray-600">
                  Activity {progress.currentSequence} of {progress.totalItems}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round((progress.currentSequence / progress.totalItems) * 100)}%
              </div>
              <p className="text-xs text-gray-600">Complete</p>
            </div>
          </div>

          {/* Visual Progress Bar */}
          <div className="relative">
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-500 ease-out"
                style={{
                  width: `${(progress.currentSequence / progress.totalItems) * 100}%`
                }}
              >
                <div className="h-full w-full bg-white opacity-20 animate-pulse"></div>
              </div>
            </div>

            {/* Clickable Activity Markers */}
            <div className="absolute top-0 left-0 right-0 flex justify-between px-1">
              {Array.from({ length: progress.totalItems }).map((_, i) => {
                const isComplete = i < currentIndex
                const isCurrent = i === currentIndex

                return (
                  <button
                    key={i}
                    onClick={() => handleJumpTo(i)}
                    className={`w-4 h-4 rounded-full border-2 transition-all duration-300 transform -translate-y-1/2 hover:scale-125 ${
                      isComplete
                        ? 'bg-purple-600 border-purple-600'
                        : isCurrent
                        ? 'bg-white border-purple-600 scale-125 shadow-lg'
                        : 'bg-white border-gray-300 hover:border-purple-400'
                    }`}
                    title={`Go to Activity ${i + 1}`}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Content with Transition */}
      <div className="overflow-y-auto" style={{ height: 'calc(100vh - 180px)' }}>
        <div
          className={`transition-all duration-300 ${
            isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
          }`}
        >
          <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Activity Card */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {/* Activity Header */}
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-2xl">
                    {getActivityIcon(currentActivity?.type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">
                      {currentActivity?.prompt || `Activity ${currentIndex + 1}`}
                    </h3>
                    <p className="text-purple-100 text-sm capitalize">
                      {currentActivity?.type?.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Activity Content */}
              <div className="p-6">
                {renderActivityContent()}
              </div>
            </div>

            {/* Navigation Controls */}
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  currentIndex === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-purple-600 border-2 border-purple-600 hover:bg-purple-50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>

              <div className="flex gap-2">
                {activities.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => handleJumpTo(i)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      i === currentIndex
                        ? 'bg-purple-600 scale-125'
                        : 'bg-gray-300 hover:bg-purple-300'
                    }`}
                    title={`Activity ${i + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={handleNext}
                disabled={currentIndex === totalActivities - 1}
                className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  currentIndex === totalActivities - 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                Next
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Hint */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Click on the progress markers or use Previous/Next to navigate between activities
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Close Button (Fixed) */}
      <button
        onClick={onClose}
        className="fixed bottom-6 right-6 px-6 py-3 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-900 transition-all flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        Exit Preview
      </button>
    </div>
  )
}
