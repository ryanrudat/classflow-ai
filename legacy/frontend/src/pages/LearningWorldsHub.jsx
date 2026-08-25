import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useLearningWorldStore } from '../stores/learningWorldStore'
import { learningWorldsAPI } from '../services/api'
import { LoadingSpinner } from '../components/LoadingStates'
import { useNotifications } from '../components/Toast'

/**
 * Learning Worlds Hub
 *
 * Teacher's main view for managing Learning Worlds:
 * - View all worlds
 * - Create new worlds
 * - Edit existing worlds
 * - Start teaching sessions
 */
export default function LearningWorldsHub() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { worlds, fetchWorlds, createWorld, deleteWorld, loading } = useLearningWorldStore()
  const { notifySuccess, notifyError } = useNotifications()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [templates, setTemplates] = useState([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  // Load worlds on mount
  useEffect(() => {
    fetchWorlds()
    loadTemplates()
  }, [])

  async function loadTemplates() {
    setLoadingTemplates(true)
    try {
      const data = await learningWorldsAPI.getTemplates()
      setTemplates(data.templates || [])
    } catch (error) {
      console.error('Failed to load templates:', error)
    }
    setLoadingTemplates(false)
  }

  async function handleCreateWorld(worldData) {
    const result = await createWorld(worldData)
    if (result.success) {
      notifySuccess('Learning World created!')
      setShowCreateModal(false)
      navigate(`/worlds/${result.world.id}/edit`)
    } else {
      notifyError(result.error || 'Failed to create world')
    }
  }

  async function handleDeleteWorld(worldId) {
    if (!window.confirm('Are you sure you want to delete this Learning World? This cannot be undone.')) {
      return
    }
    const result = await deleteWorld(worldId)
    if (result.success) {
      notifySuccess('Learning World deleted')
    } else {
      notifyError(result.error || 'Failed to delete world')
    }
  }

  function handleStartSession(worldId) {
    navigate(`/worlds/${worldId}/play`)
  }

  function handleEditWorld(worldId) {
    console.log('Editing world:', worldId)
    navigate(`/worlds/${worldId}/edit`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-sky-200">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-gray-800"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Learning Worlds</h1>
              <p className="text-sm text-gray-500">Interactive adventures for young learners</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create World
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* My Worlds Section */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">My Worlds</h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : worlds.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
              <div className="w-24 h-24 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">No worlds yet</h3>
              <p className="text-gray-500 mb-6">Create your first Learning World to start teaching!</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-sky-500 text-white rounded-xl font-semibold hover:bg-sky-600 transition-colors"
              >
                Create Your First World
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {worlds.map(world => (
                <WorldCard
                  key={world.id}
                  world={world}
                  onStart={() => handleStartSession(world.id)}
                  onEdit={() => handleEditWorld(world.id)}
                  onDelete={() => handleDeleteWorld(world.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Templates Section */}
        <section>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Pre-Built Templates</h2>
          <p className="text-gray-500 mb-6">Start with a ready-made land and customize it for your students</p>

          {loadingTemplates ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {templates.map(template => (
                <TemplateCard key={template.id} template={template} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Create World Modal */}
      {showCreateModal && (
        <CreateWorldModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateWorld}
        />
      )}
    </div>
  )
}

/**
 * World Card Component
 */
function WorldCard({ world, onStart, onEdit, onDelete }) {
  const themeColors = {
    fantasy: 'from-purple-400 to-pink-400',
    nature: 'from-green-400 to-emerald-400',
    space: 'from-indigo-400 to-purple-400',
    underwater: 'from-blue-400 to-cyan-400'
  }

  const bgGradient = themeColors[world.theme] || themeColors.fantasy

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* World Preview */}
      <div className={`h-32 bg-gradient-to-br ${bgGradient} relative`}>
        {world.map_background_url ? (
          <img
            src={world.map_background_url}
            alt={world.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-16 h-16 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}

        {/* Land count badge */}
        <div className="absolute top-2 right-2 bg-black/30 text-white px-2 py-1 rounded-lg text-sm">
          {world.land_count || 0} lands
        </div>
      </div>

      {/* World Info */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-800 mb-1">{world.name}</h3>
        <p className="text-sm text-gray-500 mb-3">
          Ages {world.target_age_min}-{world.target_age_max}
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onStart}
            className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors text-sm"
          >
            Start Session
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            title="Edit World"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="px-3 py-2 bg-gray-100 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
            title="Delete World"
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

/**
 * Template Card Component
 */
function TemplateCard({ template }) {
  const navigate = useNavigate()
  const { notifySuccess, notifyError } = useNotifications()

  async function handleUseTemplate() {
    // First create a world, then import the template
    try {
      const worldResult = await learningWorldsAPI.createWorld({
        name: template.name,
        description: template.description,
        targetAgeMin: template.target_age_min,
        targetAgeMax: template.target_age_max
      })

      if (worldResult.world) {
        await learningWorldsAPI.importTemplate(worldResult.world.id, template.id)
        notifySuccess('Template imported successfully!')
        navigate(`/worlds/${worldResult.world.id}/edit`)
      }
    } catch (error) {
      notifyError(error.message || 'Failed to use template')
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow border-2 border-dashed border-gray-200 hover:border-sky-300">
      <div className="h-24 bg-gradient-to-br from-sky-100 to-sky-200 flex items-center justify-center">
        {template.icon_url ? (
          <img src={template.icon_url} alt={template.name} className="w-16 h-16" />
        ) : (
          <div className="text-4xl">
            {template.category === 'animals' ? '🦁' :
             template.category === 'colors' ? '🌈' :
             template.category === 'food' ? '🍎' :
             template.category === 'numbers' ? '🔢' : '📚'}
          </div>
        )}
      </div>
      <div className="p-3">
        <h4 className="font-medium text-gray-800 text-sm">{template.name}</h4>
        <p className="text-xs text-gray-500 mb-2">{template.times_used || 0} uses</p>
        <button
          onClick={handleUseTemplate}
          className="w-full px-3 py-1.5 bg-sky-100 text-sky-700 rounded-lg text-sm font-medium hover:bg-sky-200 transition-colors"
        >
          Use Template
        </button>
      </div>
    </div>
  )
}

/**
 * Create World Modal
 */
function CreateWorldModal({ onClose, onCreate }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    theme: 'fantasy',
    targetAgeMin: 4,
    targetAgeMax: 10,
    targetLanguage: 'en',
    supportLanguage: 'zh-TW'
  })
  const [loading, setLoading] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (!formData.name.trim()) return
    setLoading(true)
    onCreate(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Create Learning World</h2>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* World Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                World Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="My English World"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="A fun world for learning English vocabulary"
                rows={2}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Theme */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Theme
              </label>
              <div className="grid grid-cols-4 gap-2">
                {['fantasy', 'nature', 'space', 'underwater'].map(theme => (
                  <button
                    key={theme}
                    type="button"
                    onClick={() => setFormData({ ...formData, theme })}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      formData.theme === theme
                        ? 'border-sky-500 bg-sky-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl block text-center">
                      {theme === 'fantasy' ? '🏰' :
                       theme === 'nature' ? '🌲' :
                       theme === 'space' ? '🚀' : '🐠'}
                    </span>
                    <span className="text-xs text-gray-600 capitalize">{theme}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Age Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Ages
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={formData.targetAgeMin}
                  onChange={e => setFormData({ ...formData, targetAgeMin: parseInt(e.target.value) })}
                  className="flex-1 px-3 py-2 border rounded-lg"
                >
                  {[4, 5, 6, 7, 8, 9, 10].map(age => (
                    <option key={age} value={age}>{age}</option>
                  ))}
                </select>
                <span className="text-gray-400">to</span>
                <select
                  value={formData.targetAgeMax}
                  onChange={e => setFormData({ ...formData, targetAgeMax: parseInt(e.target.value) })}
                  className="flex-1 px-3 py-2 border rounded-lg"
                >
                  {[4, 5, 6, 7, 8, 9, 10].map(age => (
                    <option key={age} value={age}>{age}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="px-6 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create World'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
