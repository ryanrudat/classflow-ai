import { useState, useRef } from 'react'
import api from '../services/api'
import { useToast } from './Toast'

/**
 * MediaUpload Component
 * Unified upload for documents AND videos
 * Supports: PDF, Word, Text, MP4, MOV, WebM
 */

export default function MediaUpload({ sessionId, onMediaUploaded, onActivityGenerated }) {
  const toast = useToast()
  const fileInputRef = useRef(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileType, setFileType] = useState(null) // 'document' or 'video'
  const [activityType, setActivityType] = useState('quiz')
  const [difficulty, setDifficulty] = useState('medium')
  const [uploadAction, setUploadAction] = useState(null) // 'save' | 'generate' | null
  const [dragActive, setDragActive] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadStage, setUploadStage] = useState('') // 'uploading', 'transcribing', 'generating'

  // Supported file types
  const documentTypes = {
    mimeTypes: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain'],
    extensions: ['.pdf', '.docx', '.doc', '.txt', '.md']
  }

  const videoTypes = {
    mimeTypes: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/x-matroska'],
    extensions: ['.mp4', '.mov', '.webm', '.avi', '.mkv']
  }

  const activityTypes = [
    {
      value: 'quiz',
      label: 'Quiz',
      description: 'Multiple choice questions',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    },
    {
      value: 'questions',
      label: 'Discussion Questions',
      description: 'Open-ended questions',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      value: 'mixed',
      label: 'Mixed Assessment',
      description: 'Quiz + discussion questions',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
      )
    }
  ]

  const determineFileType = (file) => {
    const ext = '.' + file.name.split('.').pop().toLowerCase()

    if (documentTypes.mimeTypes.includes(file.type) || documentTypes.extensions.includes(ext)) {
      return 'document'
    }
    if (videoTypes.mimeTypes.includes(file.type) || videoTypes.extensions.includes(ext)) {
      return 'video'
    }
    return null
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (file) => {
    const type = determineFileType(file)

    if (!type) {
      toast.error('Unsupported File', 'Please upload a PDF, Word document, text file, or video (MP4, MOV, WebM)')
      return
    }

    // File size limits
    const maxSize = type === 'video' ? 500 * 1024 * 1024 : 25 * 1024 * 1024 // 500MB for video, 25MB for docs
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / 1024 / 1024
      toast.error('File Too Large', `Maximum file size is ${maxSizeMB}MB for ${type}s`)
      return
    }

    setSelectedFile(file)
    setFileType(type)
  }

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + ' KB'
    }
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  }

  const handleSaveOnly = async () => {
    if (!selectedFile || !sessionId || uploadAction) return

    setUploadAction('save')
    setProgress(0)
    setUploadStage('uploading')

    try {
      const formData = new FormData()

      if (fileType === 'video') {
        formData.append('video', selectedFile)
        formData.append('sessionId', sessionId)

        // Upload video
        const response = await api.post('/media/upload/video', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            setProgress(percentCompleted)
          }
        })

        toast.success('Video Uploaded', 'Your video is ready. You can transcribe it and add questions.')
        if (onMediaUploaded) {
          onMediaUploaded({ ...response.data, type: 'video' })
        }
      } else {
        formData.append('document', selectedFile)
        formData.append('sessionId', sessionId)
        formData.append('title', selectedFile.name)

        const response = await api.post('/documents/save', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            setProgress(percentCompleted)
          }
        })

        toast.success('Document Saved', 'You can generate activities from it later.')
        if (onMediaUploaded) {
          onMediaUploaded({ ...response.data.activity, type: 'document' })
        }
      }

      setSelectedFile(null)
      setFileType(null)
      setProgress(0)

    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Upload Failed', error.response?.data?.message || 'Failed to upload file')
    } finally {
      setUploadAction(null)
      setUploadStage('')
    }
  }

  const handleUploadAndGenerate = async () => {
    if (!selectedFile || !sessionId || uploadAction) return

    setUploadAction('generate')
    setProgress(0)

    try {
      const formData = new FormData()

      if (fileType === 'video') {
        // Video flow: upload → transcribe → generate questions
        setUploadStage('uploading')
        formData.append('video', selectedFile)
        formData.append('sessionId', sessionId)

        // Upload video
        const uploadResponse = await api.post('/media/upload/video', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 50) / progressEvent.total)
            setProgress(percentCompleted)
          }
        })

        const videoId = uploadResponse.data.id

        // Transcribe video
        setUploadStage('transcribing')
        setProgress(55)

        const transcribeResponse = await api.post(`/videos/${videoId}/transcribe`)
        setProgress(75)

        // Generate questions from transcript
        setUploadStage('generating')
        const questionsResponse = await api.post(`/videos/${videoId}/generate-questions`, {
          difficulty,
          count: 5
        })
        setProgress(100)

        toast.success('Video Processed', 'Questions generated from your video!')

        if (onActivityGenerated) {
          onActivityGenerated({
            type: 'video',
            videoId,
            url: uploadResponse.data.url,
            duration: uploadResponse.data.duration,
            transcript: transcribeResponse.data.transcript,
            questions: questionsResponse.data.questions
          })
        }

      } else {
        // Document flow: upload and generate
        setUploadStage('uploading')
        formData.append('document', selectedFile)
        formData.append('activityType', activityType)
        formData.append('difficulty', difficulty)
        formData.append('sessionId', sessionId)

        const response = await api.post('/documents/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 50) / progressEvent.total)
            setProgress(percentCompleted)
          }
        })

        setUploadStage('generating')
        setProgress(100)

        toast.success('Activity Generated', 'Activity created from your document!')

        if (onActivityGenerated) {
          onActivityGenerated(response.data.activity)
        }
      }

      setSelectedFile(null)
      setFileType(null)
      setProgress(0)

    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Processing Failed', error.response?.data?.message || 'Failed to process file')
    } finally {
      setUploadAction(null)
      setUploadStage('')
    }
  }

  const getStageText = () => {
    switch (uploadStage) {
      case 'uploading': return 'Uploading...'
      case 'transcribing': return 'Transcribing audio...'
      case 'generating': return 'Generating questions...'
      default: return 'Processing...'
    }
  }

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <h3 className="text-lg font-bold text-gray-900">Upload Media</h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Upload a document or video. We'll extract content and help you create interactive activities.
      </p>

      {/* File Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : selectedFile
            ? fileType === 'video' ? 'border-purple-500 bg-purple-50' : 'border-green-500 bg-green-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
      >
        {selectedFile ? (
          <div className="flex flex-col items-center gap-3">
            {fileType === 'video' ? (
              <svg className="w-12 h-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <div>
              <p className="font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-sm text-gray-600">{formatFileSize(selectedFile.size)}</p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                fileType === 'video' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
              }`}>
                {fileType === 'video' ? 'Video' : 'Document'}
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setSelectedFile(null)
                setFileType(null)
              }}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-700 font-medium">
                Drag and drop your file here
              </p>
              <p className="text-sm text-gray-500">or click to browse</p>
            </div>
            <p className="text-xs text-gray-500">
              Documents: PDF, Word, Text (25MB) | Videos: MP4, MOV, WebM (500MB)
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.doc,.txt,.md,.mp4,.mov,.webm,.avi,.mkv"
          onChange={handleFileInputChange}
        />
      </div>

      {/* Options after file selection */}
      {selectedFile && (
        <div className="mt-6 space-y-4">
          {/* Activity Type Selector (for documents) */}
          {fileType === 'document' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What would you like to generate?
              </label>
              <div className="grid grid-cols-3 gap-3">
                {activityTypes.map((type) => (
                  <button
                    type="button"
                    key={type.value}
                    onClick={() => setActivityType(type.value)}
                    className={`p-3 border-2 rounded-lg text-left transition-all ${
                      activityType === type.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-gray-700">{type.icon}</div>
                      <span className="font-medium text-gray-900 text-sm">{type.label}</span>
                    </div>
                    <p className="text-xs text-gray-600">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Video info */}
          {fileType === 'video' && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-purple-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-medium text-purple-900">Video Processing</p>
                  <p className="text-sm text-purple-700">
                    We'll transcribe the audio and generate interactive questions at key moments.
                    You can also add your own questions manually.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Difficulty Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Difficulty Level
            </label>
            <div className="flex gap-2">
              {['easy', 'medium', 'hard'].map((level) => (
                <button
                  type="button"
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`flex-1 px-4 py-2 border-2 rounded-lg font-medium capitalize transition-all ${
                    difficulty === level
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleSaveOnly}
              disabled={uploadAction !== null}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {uploadAction === 'save' ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading... {progress}%
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Just Upload
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleUploadAndGenerate}
              disabled={uploadAction !== null}
              className={`px-6 py-3 text-white rounded-lg font-medium disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 ${
                fileType === 'video'
                  ? 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400'
                  : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400'
              }`}
            >
              {uploadAction === 'generate' ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {getStageText()} {progress}%
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {fileType === 'video' ? 'Process & Generate Questions' : 'Generate Activity'}
                </>
              )}
            </button>
          </div>

          {/* Progress Bar */}
          {uploadAction && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ease-out ${
                    fileType === 'video' ? 'bg-purple-600' : 'bg-blue-600'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 text-center">{getStageText()}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
