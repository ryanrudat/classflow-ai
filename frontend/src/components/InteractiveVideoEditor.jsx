import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { useToast } from './Toast'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/**
 * InteractiveVideoEditor Component
 * Allows teachers to upload videos and add timestamp-based questions
 */
export default function InteractiveVideoEditor({ sessionId, onClose, onSaved }) {
  const toast = useToast()
  const token = localStorage.getItem('token')
  const videoRef = useRef(null)
  const fileInputRef = useRef(null)

  const [step, setStep] = useState('upload') // 'upload', 'add-questions', 'preview'
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Video data
  const [uploadedVideo, setUploadedVideo] = useState(null)
  const [activity, setActivity] = useState(null)

  // Questions
  const [questions, setQuestions] = useState([])
  const [currentTime, setCurrentTime] = useState(0)
  const [addingQuestion, setAddingQuestion] = useState(false)

  // Question form
  const [newQuestion, setNewQuestion] = useState({
    timestamp_seconds: 0,
    question_type: 'multiple_choice',
    question_text: '',
    options: ['', '', '', ''],
    correct_answer: 0
  })

  // AI Generation state
  const [transcribing, setTranscribing] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('Error', 'Please select a video file')
      return
    }

    // Validate file size (100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error('Error', 'Video must be smaller than 100MB')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('video', file)

      const response = await axios.post(
        `${API_URL}/api/videos/upload`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            setUploadProgress(progress)
          }
        }
      )

      setUploadedVideo(response.data)

      // Check video duration (max 10 minutes)
      if (response.data.duration > 600) {
        toast.error('Error', 'Video must be 10 minutes or shorter')
        setUploadedVideo(null)
        return
      }

      toast.success('Success', 'Video uploaded successfully!')

      // Create interactive video activity
      const activityResponse = await axios.post(
        `${API_URL}/api/sessions/${sessionId}/activities/interactive-video`,
        {
          videoId: response.data.id,
          title: file.name.replace(/\.[^/.]+$/, ''),
          difficulty_level: 'medium'
        },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      setActivity(activityResponse.data.activity)
      setStep('add-questions')

    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Error', error.response?.data?.message || 'Failed to upload video')
    } finally {
      setUploading(false)
    }
  }

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleSetQuestionTimestamp = () => {
    setNewQuestion({
      ...newQuestion,
      timestamp_seconds: Math.floor(currentTime)
    })
    setAddingQuestion(true)
  }

  const handleAddQuestion = async () => {
    if (!newQuestion.question_text.trim()) {
      toast.error('Error', 'Please enter a question')
      return
    }

    if (newQuestion.question_type === 'multiple_choice') {
      const validOptions = newQuestion.options.filter(opt => opt.trim())
      if (validOptions.length < 2) {
        toast.error('Error', 'Please enter at least 2 answer options')
        return
      }
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/activities/${activity.id}/video-questions`,
        newQuestion,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      setQuestions([...questions, response.data.question])
      toast.success('Success', 'Question added!')

      // Reset form
      setNewQuestion({
        timestamp_seconds: 0,
        question_type: 'multiple_choice',
        question_text: '',
        options: ['', '', '', ''],
        correct_answer: 0
      })
      setAddingQuestion(false)

    } catch (error) {
      console.error('Add question error:', error)
      toast.error('Error', 'Failed to add question')
    }
  }

  const handleRemoveQuestion = async (questionId) => {
    try {
      await axios.delete(
        `${API_URL}/api/video-questions/${questionId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      setQuestions(questions.filter(q => q.id !== questionId))
      toast.success('Success', 'Question removed')
    } catch (error) {
      console.error('Remove question error:', error)
      toast.error('Error', 'Failed to remove question')
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleSave = () => {
    if (questions.length === 0) {
      toast.error('Error', 'Please add at least one question')
      return
    }

    toast.success('Success', 'Interactive video activity created!')
    if (onSaved) {
      onSaved(activity)
    }
    onClose()
  }

  const handleGenerateAIQuestions = async () => {
    if (!uploadedVideo) return

    try {
      setTranscribing(true)
      toast.info('Info', 'Transcribing video... This may take a minute.')

      // Step 1: Transcribe the video
      const transcribeResponse = await axios.post(
        `${API_URL}/api/videos/${uploadedVideo.id}/transcribe`,
        {},
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      toast.success('Success', 'Video transcribed! Generating questions...')
      setTranscribing(false)
      setGeneratingAI(true)

      // Step 2: Generate questions from transcript
      const generateResponse = await axios.post(
        `${API_URL}/api/videos/${uploadedVideo.id}/generate-questions`,
        {
          difficulty: activity.difficulty_level || 'medium',
          count: 5
        },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      setAiSuggestions(generateResponse.data.questions)
      setShowSuggestions(true)
      setGeneratingAI(false)

      toast.success('Success', `Generated ${generateResponse.data.questions.length} question suggestions!`)

    } catch (error) {
      console.error('AI generation error:', error)
      setTranscribing(false)
      setGeneratingAI(false)
      toast.error('Error', error.response?.data?.message || 'Failed to generate questions')
    }
  }

  const handleAcceptSuggestion = async (suggestion) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/activities/${activity.id}/video-questions`,
        {
          timestamp_seconds: suggestion.timestamp_seconds,
          question_type: suggestion.question_type,
          question_text: suggestion.question_text,
          options: suggestion.options || null,
          correct_answer: suggestion.correct_answer !== undefined ? suggestion.correct_answer : null,
          ai_generated: true
        },
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      setQuestions([...questions, response.data.question])
      setAiSuggestions(aiSuggestions.filter(s => s !== suggestion))
      toast.success('Success', 'Question added!')

    } catch (error) {
      console.error('Accept suggestion error:', error)
      toast.error('Error', 'Failed to add question')
    }
  }

  const handleAcceptAllSuggestions = async () => {
    try {
      const addedQuestions = []

      for (const suggestion of aiSuggestions) {
        const response = await axios.post(
          `${API_URL}/api/activities/${activity.id}/video-questions`,
          {
            timestamp_seconds: suggestion.timestamp_seconds,
            question_type: suggestion.question_type,
            question_text: suggestion.question_text,
            options: suggestion.options || null,
            correct_answer: suggestion.correct_answer !== undefined ? suggestion.correct_answer : null,
            ai_generated: true
          },
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        )
        addedQuestions.push(response.data.question)
      }

      setQuestions([...questions, ...addedQuestions])
      setAiSuggestions([])
      setShowSuggestions(false)
      toast.success('Success', `Added ${addedQuestions.length} questions!`)

    } catch (error) {
      console.error('Accept all error:', error)
      toast.error('Error', 'Failed to add all questions')
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-editor-title"
    >
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="video-editor-title" className="text-xl font-bold text-gray-900">
                Create Interactive Video
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {step === 'upload' && 'Upload a video (max 10 minutes)'}
                {step === 'add-questions' && `${questions.length} question${questions.length !== 1 ? 's' : ''} added`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2"
              aria-label="Close video editor"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Upload Video */}
          {step === 'upload' && (
            <div className="max-w-2xl mx-auto">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-400 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {!uploading ? (
                  <>
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                    </svg>
                    <p className="text-lg font-medium text-gray-900 mb-2">Upload Video</p>
                    <p className="text-sm text-gray-600 mb-4">MP4, MOV, AVI, WebM, MKV • Max 10 minutes • 100MB limit</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      Select Video File
                    </button>
                  </>
                ) : (
                  <div>
                    <div className="w-64 mx-auto mb-4">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-gray-700">Uploading... {uploadProgress}%</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Add Questions */}
          {step === 'add-questions' && uploadedVideo && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Video Player */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Video Preview</h3>
                <div className="bg-black rounded-lg overflow-hidden mb-4">
                  <video
                    ref={videoRef}
                    src={`${API_URL}${uploadedVideo.url}`}
                    controls
                    onTimeUpdate={handleVideoTimeUpdate}
                    className="w-full"
                  />
                </div>

                <div className="mb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Current Time: <span className="font-medium text-gray-900">{formatTime(currentTime)}</span>
                    </span>
                    <button
                      onClick={handleSetQuestionTimestamp}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Question Here
                    </button>
                  </div>

                  {/* AI Generation Button */}
                  <button
                    onClick={handleGenerateAIQuestions}
                    disabled={transcribing || generatingAI}
                    className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {transcribing ? (
                      <>
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Transcribing video...
                      </>
                    ) : generatingAI ? (
                      <>
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Generating questions...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        Generate AI Questions
                      </>
                    )}
                  </button>
                </div>

                {/* Questions List */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Questions ({questions.length})</h3>
                  {questions.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No questions added yet. Click "Add Question Here" while watching the video.</p>
                  ) : (
                    <div className="space-y-2">
                      {questions.sort((a, b) => a.timestampSeconds - b.timestampSeconds).map((q, idx) => (
                        <div key={q.id} className="p-3 border border-gray-200 rounded-lg flex items-start justify-between hover:border-blue-400 transition-colors">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-blue-600">{formatTime(q.timestampSeconds)}</span>
                              <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">{q.questionType.replace('_', ' ')}</span>
                            </div>
                            <p className="text-sm text-gray-900 font-medium line-clamp-2">{q.questionText}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveQuestion(q.id)}
                            className="text-red-600 hover:text-red-700 p-1"
                            aria-label="Remove question"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Question Form */}
              <div>
                {addingQuestion ? (
                  <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">New Question at {formatTime(newQuestion.timestamp_seconds)}</h3>
                      <button
                        onClick={() => setAddingQuestion(false)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* Question Type */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Question Type</label>
                      <select
                        value={newQuestion.question_type}
                        onChange={(e) => setNewQuestion({ ...newQuestion, question_type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="open_ended">Open Ended</option>
                      </select>
                    </div>

                    {/* Question Text */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Question</label>
                      <textarea
                        value={newQuestion.question_text}
                        onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows="3"
                        placeholder="Enter your question..."
                      />
                    </div>

                    {/* Multiple Choice Options */}
                    {newQuestion.question_type === 'multiple_choice' && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Answer Options</label>
                        <div className="space-y-2">
                          {newQuestion.options.map((option, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="correct-answer"
                                checked={newQuestion.correct_answer === idx}
                                onChange={() => setNewQuestion({ ...newQuestion, correct_answer: idx })}
                                className="w-4 h-4 text-green-600"
                              />
                              <span className="text-sm font-medium text-gray-600">{String.fromCharCode(65 + idx)}.</span>
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...newQuestion.options]
                                  newOptions[idx] = e.target.value
                                  setNewQuestion({ ...newQuestion, options: newOptions })
                                }}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                              />
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Select the radio button for the correct answer</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={handleAddQuestion}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        Add Question
                      </button>
                      <button
                        onClick={() => setAddingQuestion(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : showSuggestions && aiSuggestions.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">AI Suggestions ({aiSuggestions.length})</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={handleAcceptAllSuggestions}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                        >
                          Accept All
                        </button>
                        <button
                          onClick={() => {
                            setShowSuggestions(false)
                            setAiSuggestions([])
                          }}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {aiSuggestions.map((suggestion, idx) => (
                        <div key={idx} className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-purple-600">{formatTime(suggestion.timestamp_seconds)}</span>
                              <span className="text-xs px-2 py-0.5 bg-purple-100 rounded">{suggestion.question_type.replace('_', ' ')}</span>
                            </div>
                            <button
                              onClick={() => handleAcceptSuggestion(suggestion)}
                              className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                            >
                              Accept
                            </button>
                          </div>

                          <p className="text-sm font-medium text-gray-900 mb-2">{suggestion.question_text}</p>

                          {suggestion.question_type === 'multiple_choice' && suggestion.options && (
                            <div className="space-y-1">
                              {suggestion.options.map((option, optIdx) => (
                                <div key={optIdx} className="flex items-center gap-2 text-xs text-gray-700">
                                  {suggestion.correct_answer === optIdx && (
                                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                  <span className={suggestion.correct_answer === optIdx ? 'font-medium' : ''}>
                                    {String.fromCharCode(65 + optIdx)}. {option}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {suggestion.rationale && (
                            <p className="text-xs text-gray-600 mt-2 italic">💡 {suggestion.rationale}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                    <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-gray-600">
                      Play the video and click<br />"Add Question Here" at the timestamp<br />where you want a question to appear<br /><br />
                      Or use "Generate AI Questions" to let AI<br />create questions automatically!
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'add-questions' && (
          <div className="p-6 border-t border-gray-200 flex gap-3 bg-gray-50">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={questions.length === 0}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Create Activity ({questions.length} question{questions.length !== 1 ? 's' : ''})
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
