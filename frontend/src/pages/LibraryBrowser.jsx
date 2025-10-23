import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api'
import { useToast } from '../components/Toast'
import ActivityPreviewModal from '../components/ActivityPreviewModal'
import EditLibraryItemModal from '../components/EditLibraryItemModal'

/**
 * LibraryBrowser Component
 * Browse, search, and reuse saved activities
 * UI/UX Best Practices:
 * - Search-first design
 * - Multiple view modes
 * - Empty states
 * - Loading states
 * - Filter chips
 * - Quick actions
 */

export default function LibraryBrowser() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()

  // Handle back navigation - go back to previous page or dashboard
  const handleBack = () => {
    // If there's history to go back to, use it; otherwise go to dashboard
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/dashboard')
    }
  }

  // State
  const [items, setItems] = useState([])
  const [stats, setStats] = useState(null)
  const [tags, setTags] = useState([])
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || '')
  const [selectedSubject, setSelectedSubject] = useState(searchParams.get('subject') || '')
  const [selectedTags, setSelectedTags] = useState(searchParams.get('tags')?.split(',').filter(Boolean) || [])
  const [selectedFolder, setSelectedFolder] = useState(searchParams.get('folder') || '')
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'recent')

  // View mode
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'

  // Modals
  const [previewModal, setPreviewModal] = useState({ open: false, item: null })
  const [editModal, setEditModal] = useState({ open: false, item: null })
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, item: null })

  // Load library data
  useEffect(() => {
    loadLibrary()
    loadStats()
    loadTags()
    loadFolders()
  }, [searchQuery, selectedType, selectedSubject, selectedTags, selectedFolder, sortBy])

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('search', searchQuery)
    if (selectedType) params.set('type', selectedType)
    if (selectedSubject) params.set('subject', selectedSubject)
    if (selectedTags.length > 0) params.set('tags', selectedTags.join(','))
    if (selectedFolder) params.set('folder', selectedFolder)
    if (sortBy !== 'recent') params.set('sortBy', sortBy)
    setSearchParams(params)
  }, [searchQuery, selectedType, selectedSubject, selectedTags, selectedFolder, sortBy])

  async function loadLibrary() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (selectedType) params.append('type', selectedType)
      if (selectedSubject) params.append('subject', selectedSubject)
      if (selectedTags.length > 0) params.append('tags', selectedTags.join(','))
      if (selectedFolder) params.append('folder', selectedFolder)
      if (sortBy) params.append('sortBy', sortBy)

      const response = await api.get(`/library?${params.toString()}`)
      setItems(response.data.items)
    } catch (error) {
      console.error('Load library error:', error)
      toast.error('Error', 'Failed to load library')
    } finally {
      setLoading(false)
    }
  }

  async function loadStats() {
    try {
      const response = await api.get('/library/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Load stats error:', error)
    }
  }

  async function loadTags() {
    try {
      const response = await api.get('/library/tags')
      setTags(response.data.tags)
    } catch (error) {
      console.error('Load tags error:', error)
    }
  }

  async function loadFolders() {
    try {
      const response = await api.get('/library/folders')
      setFolders(response.data.folders)
    } catch (error) {
      console.error('Load folders error:', error)
    }
  }

  async function handleReuse(item, sessionId) {
    try {
      await api.post(`/library/${item.id}/reuse`, { sessionId })
      toast.success('Success', 'Activity added to session!')
      setPreviewModal({ open: false, item: null })
      loadLibrary() // Refresh to update usage count
    } catch (error) {
      console.error('Reuse error:', error)
      toast.error('Error', 'Failed to reuse activity')
    }
  }

  async function handleDelete(item) {
    try {
      await api.delete(`/library/${item.id}`)
      toast.success('Success', 'Activity deleted from library')
      setDeleteConfirm({ open: false, item: null })
      loadLibrary()
      loadStats()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Error', 'Failed to delete activity')
    }
  }

  function clearFilters() {
    setSearchQuery('')
    setSelectedType('')
    setSelectedSubject('')
    setSelectedTags([])
    setSelectedFolder('')
    setSortBy('recent')
  }

  const hasActiveFilters = searchQuery || selectedType || selectedSubject || selectedTags.length > 0 || selectedFolder

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBack}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Content Library</h1>
              </div>
              {stats && (
                <p className="text-sm text-gray-600 mt-1">
                  {stats.totalItems} {stats.totalItems === 1 ? 'item' : 'items'} •
                  Used {stats.totalUses} {stats.totalUses === 1 ? 'time' : 'times'}
                </p>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-4">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search activities..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="reading">Reading</option>
              <option value="questions">Questions</option>
              <option value="quiz">Quiz</option>
              <option value="discussion">Discussion</option>
            </select>

            {/* Subject Filter */}
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Subjects</option>
              <option value="English">English</option>
              <option value="History">History</option>
              <option value="Social Studies">Social Studies</option>
              <option value="Government">Government</option>
              <option value="Biology">Biology</option>
            </select>

            {/* Folder Filter */}
            {folders.length > 0 && (
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Folders</option>
                {folders.map((folder) => (
                  <option key={folder.name} value={folder.name}>
                    {folder.name} ({folder.itemCount})
                  </option>
                ))}
              </select>
            )}

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="recent">Recently Added</option>
              <option value="popular">Most Used</option>
              <option value="alphabetical">Alphabetical</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Active Tag Filters */}
          {selectedTags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                >
                  {tag}
                  <button
                    onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))}
                    className="hover:text-blue-900"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <LoadingState viewMode={viewMode} />
        ) : items.length === 0 ? (
          <EmptyState hasFilters={hasActiveFilters} onClearFilters={clearFilters} />
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {items.map((item) => (
              <LibraryCard
                key={item.id}
                item={item}
                viewMode={viewMode}
                onPreview={() => setPreviewModal({ open: true, item })}
                onEdit={() => setEditModal({ open: true, item })}
                onDelete={() => setDeleteConfirm({ open: true, item })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {previewModal.open && (
        <ActivityPreviewModal
          item={previewModal.item}
          onClose={() => setPreviewModal({ open: false, item: null })}
          onReuse={handleReuse}
        />
      )}

      {editModal.open && (
        <EditLibraryItemModal
          item={editModal.item}
          allTags={tags}
          onClose={() => setEditModal({ open: false, item: null })}
          onSave={() => {
            setEditModal({ open: false, item: null })
            loadLibrary()
            loadTags()
          }}
        />
      )}

      {deleteConfirm.open && (
        <DeleteConfirmModal
          item={deleteConfirm.item}
          onConfirm={() => handleDelete(deleteConfirm.item)}
          onCancel={() => setDeleteConfirm({ open: false, item: null })}
        />
      )}
    </div>
  )
}

/** Library Card Component */
function LibraryCard({ item, viewMode, onPreview, onEdit, onDelete }) {
  // SVG Line Icons for activity types
  const getTypeIcon = (type) => {
    switch (type) {
      case 'reading':
        return (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        )
      case 'questions':
        return (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'quiz':
        return (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        )
      case 'discussion':
        return (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )
      default:
        return (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
    }
  }

  const difficultyColors = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-red-100 text-red-700'
  }

  if (viewMode === 'list') {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-gray-700">{getTypeIcon(item.type)}</div>
              <h3 className="text-lg font-semibold text-gray-900 truncate">{item.title}</h3>
            </div>
            {item.description && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">{item.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {item.subject && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                  {item.subject}
                </span>
              )}
              {item.difficulty_level && (
                <span className={`px-2 py-1 rounded-full font-medium ${difficultyColors[item.difficulty_level]}`}>
                  {item.difficulty_level}
                </span>
              )}
              {item.times_used > 0 && (
                <span className="text-gray-500">Used {item.times_used}x</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onPreview}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Preview
            </button>
            <button
              onClick={onEdit}
              className="p-1.5 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-red-600 hover:text-red-700 rounded-lg hover:bg-red-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Grid view
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-lg transition-shadow group">
      <div className="flex items-start justify-between mb-3">
        <div className="text-gray-700">{getTypeIcon(item.type)}</div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{item.title}</h3>

      {item.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-3">{item.description}</p>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {item.subject && (
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            {item.subject}
          </span>
        )}
        {item.difficulty_level && (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyColors[item.difficulty_level]}`}>
            {item.difficulty_level}
          </span>
        )}
        {item.tags && item.tags.filter(Boolean).map((tag) => (
          <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-200">
        <span className="text-xs text-gray-500">
          {item.times_used > 0 ? `Used ${item.times_used}x` : 'Never used'}
        </span>
        <button
          onClick={onPreview}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Use Activity
        </button>
      </div>
    </div>
  )
}

/** Loading State */
function LoadingState({ viewMode }) {
  const skeletonCount = viewMode === 'grid' ? 6 : 4

  return (
    <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
      {Array.from({ length: skeletonCount }).map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-lg p-5 animate-pulse">
          <div className="flex justify-between mb-3">
            <div className="w-10 h-10 bg-gray-200 rounded"></div>
            <div className="flex gap-2">
              <div className="w-6 h-6 bg-gray-200 rounded"></div>
              <div className="w-6 h-6 bg-gray-200 rounded"></div>
            </div>
          </div>
          <div className="h-6 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-4 w-3/4"></div>
          <div className="flex gap-2 mb-4">
            <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
            <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-gray-200">
            <div className="h-4 w-20 bg-gray-200 rounded"></div>
            <div className="h-9 w-28 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

/** Empty State */
function EmptyState({ hasFilters, onClearFilters }) {
  if (hasFilters) {
    return (
      <div className="text-center py-16">
        <svg className="mx-auto w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No activities found</h3>
        <p className="text-gray-600 mb-4">Try adjusting your filters</p>
        <button
          onClick={onClearFilters}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Clear filters
        </button>
      </div>
    )
  }

  return (
    <div className="text-center py-16">
      <svg className="mx-auto w-20 h-20 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
      </svg>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Your library is empty</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        Save activities from your sessions to reuse them later. Look for the "Save to Library" button when viewing activities.
      </p>
      <button
        onClick={() => window.history.back()}
        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
      >
        Go to Dashboard
      </button>
    </div>
  )
}

/** Delete Confirmation Modal */
function DeleteConfirmModal({ item, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Activity?</h3>
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete "{item.title}"? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
