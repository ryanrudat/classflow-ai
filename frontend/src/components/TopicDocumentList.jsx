import { useState, useEffect } from 'react'
import api from '../services/api'
import { useToast } from './Toast'

/**
 * TopicDocumentList - Display and manage uploaded documents for a topic
 */
export default function TopicDocumentList({ topicId, refreshTrigger }) {
  const toast = useToast()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (topicId) {
      loadDocuments()
    }
  }, [topicId, refreshTrigger])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/reverse-tutoring/topics/${topicId}/documents`)
      setDocuments(response.data.documents || [])
    } catch (error) {
      console.error('Failed to load documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (documentId) => {
    setDeleting(true)
    try {
      await api.delete(`/reverse-tutoring/topics/${topicId}/documents/${documentId}`)
      toast.success('Deleted', 'Document removed successfully')
      setDocuments(documents.filter(d => d.id !== documentId))
    } catch (error) {
      toast.error('Error', 'Failed to delete document')
    } finally {
      setDeleting(false)
      setDeleteConfirm(null)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  const getFileIcon = (fileType) => {
    const icons = {
      pdf: { bg: 'bg-red-100', color: 'text-red-600', label: 'PDF' },
      docx: { bg: 'bg-blue-100', color: 'text-blue-600', label: 'DOC' },
      doc: { bg: 'bg-blue-100', color: 'text-blue-600', label: 'DOC' },
      pptx: { bg: 'bg-orange-100', color: 'text-orange-600', label: 'PPT' },
      txt: { bg: 'bg-gray-100', color: 'text-gray-600', label: 'TXT' },
      md: { bg: 'bg-purple-100', color: 'text-purple-600', label: 'MD' }
    }
    return icons[fileType] || icons.txt
  }

  if (loading) {
    return (
      <div className="text-gray-500 text-sm flex items-center gap-2">
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        Loading documents...
      </div>
    )
  }

  if (documents.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Uploaded Documents ({documents.length})
      </h4>

      <div className="space-y-1.5">
        {documents.map(doc => {
          const icon = getFileIcon(doc.file_type)
          return (
            <div key={doc.id} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg group">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 ${icon.bg} ${icon.color} rounded flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                  {icon.label}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-gray-900 truncate max-w-[180px]" title={doc.original_filename}>
                    {doc.original_filename}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{formatFileSize(doc.file_size_bytes)}</span>
                    {doc.is_summarized && (
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">
                        Summarized
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDeleteConfirm(doc)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove document"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )
        })}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Document?</h3>
            <p className="text-gray-600 text-sm mb-4">
              Remove "<span className="font-medium">{deleteConfirm.original_filename}</span>" from this topic?
              Alex will no longer use this document as reference.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-medium flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
