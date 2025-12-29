import { useState } from 'react'
import api from '../services/api'
import { useToast } from './Toast'

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt', '.md', '.pptx']
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

/**
 * TopicDocumentUpload - Upload documents to a reverse tutoring topic
 * Teachers can upload PDFs, Word docs, PowerPoint, and text files
 * that ALEX will use as reference material when tutoring students.
 */
export default function TopicDocumentUpload({ topicId, onDocumentsChange }) {
  const toast = useToast()
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const validateFile = (file) => {
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error('Invalid file type', `${file.name} is not a supported file type`)
      return false
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File too large', `${file.name} exceeds 25MB limit`)
      return false
    }
    return true
  }

  const handleFiles = (newFiles) => {
    const validated = Array.from(newFiles).filter(validateFile)
    setFiles(prev => [...prev, ...validated])
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleUpload = async () => {
    if (files.length === 0) return

    setUploading(true)
    try {
      const formData = new FormData()
      files.forEach(file => formData.append('documents', file))

      const response = await api.post(
        `/reverse-tutoring/topics/${topicId}/documents`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )

      toast.success('Success', `${response.data.documents.length} document(s) uploaded`)
      setFiles([])
      if (onDocumentsChange) onDocumentsChange()

    } catch (error) {
      toast.error('Upload failed', error.response?.data?.message || 'Failed to upload documents')
    } finally {
      setUploading(false)
    }
  }

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const getFileIcon = (filename) => {
    const ext = filename.toLowerCase().split('.').pop()
    const icons = {
      pdf: { bg: 'bg-red-100', color: 'text-red-600', label: 'PDF' },
      docx: { bg: 'bg-blue-100', color: 'text-blue-600', label: 'DOC' },
      doc: { bg: 'bg-blue-100', color: 'text-blue-600', label: 'DOC' },
      pptx: { bg: 'bg-orange-100', color: 'text-orange-600', label: 'PPT' },
      txt: { bg: 'bg-gray-100', color: 'text-gray-600', label: 'TXT' },
      md: { bg: 'bg-purple-100', color: 'text-purple-600', label: 'MD' }
    }
    return icons[ext] || icons.txt
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
          dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('topic-doc-input').click()}
      >
        <svg className="w-10 h-10 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-gray-600 mb-2">Drag documents here or click to browse</p>
        <p className="text-xs text-gray-500">
          PDF, Word, PowerPoint, or Text files (max 25MB each)
        </p>
        <input
          id="topic-doc-input"
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.docx,.doc,.txt,.md,.pptx"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => {
            const icon = getFileIcon(file.name)
            return (
              <div key={i} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${icon.bg} ${icon.color} rounded flex items-center justify-center text-xs font-bold`}>
                    {icon.label}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm truncate max-w-[200px]">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(i)}
                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )
          })}

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Uploading...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload {files.length} Document{files.length > 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
