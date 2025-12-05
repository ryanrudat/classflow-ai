import { useState, useEffect } from 'react'
import api, { activitiesAPI } from '../services/api'
import { useToast } from './Toast'

/**
 * GenerateFromVideoModal
 * Modal to transcribe and generate questions from a previously uploaded video
 * Now includes a preview/edit step before saving
 */
export default function GenerateFromVideoModal({ video, onClose, onGenerated }) {
  const toast = useToast()
  const [difficulty, setDifficulty] = useState('medium')
  const [questionCount, setQuestionCount] = useState(5)
  const [processing, setProcessing] = useState(false)
  const [stage, setStage] = useState('setup') // 'setup' | 'transcribing' | 'generating' | 'preview'
  const [showTranscript, setShowTranscript] = useState(false)

  // Parse video content
  const videoContent = typeof video.content === 'string'
    ? JSON.parse(video.content)
    : video.content

  // Debug logging
  console.log('📹 Modal opened with video:', video)
  console.log('📹 Parsed videoContent:', videoContent)
  console.log('📹 hasTranscript:', !!videoContent?.transcript)
  console.log('📹 hasQuestions:', !!videoContent?.questions?.length)

  const hasTranscript = !!videoContent?.transcript
  const hasExistingQuestions = !!videoContent?.questions?.length
  const videoId = videoContent?.videoId

  // Generated questions for preview/edit - initialize with existing questions if any
  const [questions, setQuestions] = useState(videoContent?.questions || [])
  const [transcript, setTranscript] = useState(videoContent?.transcript || null)
  const [editingIndex, setEditingIndex] = useState(null)

  // If video already has questions, start in preview/edit mode
  useEffect(() => {
    if (hasExistingQuestions && stage === 'setup') {
      setStage('preview')
    }
  }, [hasExistingQuestions])

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !processing) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose, processing])

  const formatDuration = (seconds) => {
    if (!seconds) return 'Unknown duration'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatTimestamp = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleProcess = async () => {
    if (!videoId) {
      toast.error('Error', 'Video ID not found. Please re-upload the video.')
      return
    }

    setProcessing(true)

    try {
      let currentTranscript = videoContent?.transcript

      // Step 1: Transcribe if not already done
      if (!hasTranscript) {
        setStage('transcribing')
        const transcribeResponse = await api.post(`/videos/${videoId}/transcribe`)
        currentTranscript = transcribeResponse.data.transcript
        toast.success('Transcription Complete', 'Audio has been transcribed successfully!')
      }

      setTranscript(currentTranscript)

      // Step 2: Generate questions
      setStage('generating')
      const questionsResponse = await api.post(`/videos/${videoId}/generate-questions`, {
        difficulty,
        count: questionCount
      })

      // Store questions for preview/editing
      setQuestions(questionsResponse.data.questions || [])
      setStage('preview')
      toast.success('Questions Generated', `${questionsResponse.data.questions.length} questions created! Review and edit below.`)

    } catch (error) {
      console.error('Process error:', error)
      toast.error('Error', error.response?.data?.message || 'Failed to process video')
      setStage('setup')
    } finally {
      setProcessing(false)
    }
  }

  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    console.log('📹 handleSave called with video:', video)
    console.log('📹 video.id:', video.id)
    console.log('📹 questions to save:', questions)
    console.log('📹 transcript:', transcript ? 'present' : 'missing')

    if (!video.id) {
      toast.error('Error', 'Activity ID not found')
      console.error('❌ No video.id found')
      return
    }

    setSaving(true)
    try {
      // Build updated content with transcript and questions
      const updatedContent = {
        ...videoContent,
        transcript: transcript || videoContent?.transcript,
        questions: questions
      }

      console.log('📹 Saving content:', updatedContent)

      // Save to database
      const result = await activitiesAPI.updateContent(video.id, updatedContent)
      console.log('✅ Save result:', result)

      // Notify parent to refresh
      if (onGenerated) {
        onGenerated({
          ...video,
          content: updatedContent
        })
      }

      toast.success('Saved', 'Video questions have been saved!')
      onClose()
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Error', error.response?.data?.message || 'Failed to save questions')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index))
    if (editingIndex === index) {
      setEditingIndex(null)
    }
  }

  const handleUpdateQuestion = (index, field, value) => {
    setQuestions(questions.map((q, i) => {
      if (i !== index) return q
      return { ...q, [field]: value }
    }))
  }

  const handleUpdateOption = (questionIndex, optionIndex, value) => {
    setQuestions(questions.map((q, i) => {
      if (i !== questionIndex) return q
      const newOptions = [...(q.options || [])]
      newOptions[optionIndex] = value
      return { ...q, options: newOptions }
    }))
  }

  const getTranscriptText = () => {
    const t = transcript || videoContent?.transcript
    if (!t) return null
    if (t.text) return t.text
    if (t.segments) {
      return t.segments.map(seg => seg.text).join(' ')
    }
    return JSON.stringify(t)
  }

  // Preview/Edit Stage
  if (stage === 'preview') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {hasExistingQuestions ? 'Edit Video Questions' : 'Review & Edit Questions'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {questions.length} question{questions.length !== 1 ? 's' : ''} - edit or remove as needed
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-100"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Questions List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {questions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No questions to display. Go back to generate questions.</p>
                <button
                  onClick={() => setStage('setup')}
                  className="mt-4 text-purple-600 hover:text-purple-700 font-medium"
                >
                  Back to Setup
                </button>
              </div>
            ) : (
              questions.map((question, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${editingIndex === index ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {/* Question Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                          {formatTimestamp(question.timestamp_seconds)}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          question.question_type === 'multiple_choice'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {question.question_type === 'multiple_choice' ? 'Multiple Choice' : 'Open Ended'}
                        </span>
                      </div>

                      {/* Question Text */}
                      {editingIndex === index ? (
                        <textarea
                          value={question.question_text}
                          onChange={(e) => handleUpdateQuestion(index, 'question_text', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm resize-none"
                          rows={2}
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">{question.question_text}</p>
                      )}

                      {/* Multiple Choice Options */}
                      {question.question_type === 'multiple_choice' && question.options && (
                        <div className="mt-3 space-y-2">
                          {question.options.map((option, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium ${
                                question.correct_answer === optIdx
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-200 text-gray-600'
                              }`}>
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              {editingIndex === index ? (
                                <div className="flex-1 flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => handleUpdateOption(index, optIdx, e.target.value)}
                                    className="flex-1 p-1 border border-gray-300 rounded text-sm"
                                  />
                                  <button
                                    onClick={() => handleUpdateQuestion(index, 'correct_answer', optIdx)}
                                    className={`px-2 py-1 text-xs rounded ${
                                      question.correct_answer === optIdx
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-200 text-gray-600 hover:bg-green-100'
                                    }`}
                                  >
                                    Correct
                                  </button>
                                </div>
                              ) : (
                                <span className={`text-sm ${
                                  question.correct_answer === optIdx ? 'text-green-700 font-medium' : 'text-gray-600'
                                }`}>
                                  {option}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                        className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title={editingIndex === index ? 'Done Editing' : 'Edit'}
                      >
                        {editingIndex === index ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(index)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 flex gap-3 bg-gray-50">
            <button
              onClick={() => setStage('setup')}
              className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {hasExistingQuestions ? 'Regenerate All' : 'Regenerate'}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={questions.length === 0 || saving}
              className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save {questions.length} Question{questions.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Setup/Processing Stage
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {hasTranscript ? 'Generate Questions from Video' : 'Process Video'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {videoContent?.originalFilename || video.prompt || 'Untitled video'}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={processing}
              className="text-gray-400 hover:text-gray-600 transition-colors w-11 h-11 flex items-center justify-center rounded-lg hover:bg-gray-100 disabled:opacity-50"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Video Info */}
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {formatDuration(videoContent?.duration)}
                  </span>
                  {hasTranscript ? (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                      Transcribed
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                      Not Transcribed
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {hasTranscript
                    ? 'Ready to generate questions'
                    : 'Video will be transcribed first, then questions generated'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Show transcript if available */}
          {hasTranscript && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowTranscript(!showTranscript)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                {showTranscript ? 'Hide' : 'View'} Transcript
                <svg className={`w-4 h-4 transition-transform ${showTranscript ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showTranscript && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {getTranscriptText()}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Question Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Number of Questions
            </label>
            <div className="flex gap-2">
              {[3, 5, 7, 10].map((count) => (
                <button
                  key={count}
                  onClick={() => setQuestionCount(count)}
                  disabled={processing}
                  className={`flex-1 px-4 py-2 border-2 rounded-lg font-medium transition-all ${
                    questionCount === count
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  } disabled:opacity-50`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Difficulty Level
            </label>
            <div className="flex gap-2">
              {['easy', 'medium', 'hard'].map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  disabled={processing}
                  className={`flex-1 px-4 py-2 border-2 rounded-lg font-medium capitalize transition-all ${
                    difficulty === level
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  } disabled:opacity-50`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Processing Status */}
          {processing && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <div>
                  <p className="font-medium text-blue-900">
                    {stage === 'transcribing' ? 'Transcribing audio...' : 'Generating questions...'}
                  </p>
                  <p className="text-sm text-blue-700">
                    {stage === 'transcribing'
                      ? 'This may take a minute depending on video length'
                      : 'AI is creating questions based on the content'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex gap-3 bg-gray-50">
          <button
            onClick={onClose}
            disabled={processing}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleProcess}
            disabled={processing}
            className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {hasTranscript ? 'Generate Questions' : 'Transcribe & Generate'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
