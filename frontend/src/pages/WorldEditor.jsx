import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLearningWorldStore } from '../stores/learningWorldStore'
import { learningWorldsAPI } from '../services/api'
import { useNotifications } from '../components/Toast'
import { LoadingSpinner } from '../components/LoadingStates'
import { ACTIVITY_TYPES, ACTIVITY_CATEGORIES, AGE_LEVELS } from '../config/learningWorldActivityTypes'
import ActivityContentEditor from '../components/learning-worlds/ActivityContentEditor'

/**
 * World Editor Page
 *
 * Allows teachers to design their Learning Worlds:
 * - Edit world properties
 * - Add/edit lands with positions on map
 * - Add characters as guides
 * - Add activities to lands
 * - Import from templates
 */
export default function WorldEditor() {
  const { worldId } = useParams()
  const navigate = useNavigate()
  const { notifySuccess, notifyError } = useNotifications()
  const { fetchWorld, currentWorld } = useLearningWorldStore()

  const [world, setWorld] = useState(null)
  const [lands, setLands] = useState([])
  const [characters, setCharacters] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // UI State
  const [activeTab, setActiveTab] = useState('lands')
  const [selectedLand, setSelectedLand] = useState(null)
  const [showLandModal, setShowLandModal] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [showCharacterModal, setShowCharacterModal] = useState(false)
  const [editingActivity, setEditingActivity] = useState(null) // For content editor

  // Load world data
  useEffect(() => {
    loadWorld()
  }, [worldId])

  async function loadWorld() {
    setLoading(true)
    try {
      const response = await learningWorldsAPI.getWorld(worldId)
      setWorld(response.world)
      setLands(response.lands || [])
      setCharacters(response.characters || [])
    } catch (error) {
      notifyError('Failed to load world')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveWorld(updates) {
    setSaving(true)
    try {
      await learningWorldsAPI.updateWorld(worldId, updates)
      setWorld({ ...world, ...updates })
      notifySuccess('World saved')
    } catch (error) {
      notifyError('Failed to save world')
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateLand(landData) {
    try {
      const response = await learningWorldsAPI.createLand(worldId, landData)
      setLands([...lands, response.land])
      setShowLandModal(false)
      notifySuccess('Land created!')
    } catch (error) {
      notifyError('Failed to create land')
    }
  }

  async function handleUpdateLand(landId, updates) {
    try {
      const response = await learningWorldsAPI.updateLand(landId, updates)
      // Use the returned land from API (has snake_case properties)
      // Or convert camelCase to snake_case for local state
      const snakeCaseUpdates = {}
      if (updates.mapPositionX !== undefined) snakeCaseUpdates.map_position_x = updates.mapPositionX
      if (updates.mapPositionY !== undefined) snakeCaseUpdates.map_position_y = updates.mapPositionY
      if (updates.name !== undefined) snakeCaseUpdates.name = updates.name
      if (updates.description !== undefined) snakeCaseUpdates.description = updates.description
      if (updates.introStory !== undefined) snakeCaseUpdates.intro_story = updates.introStory
      if (updates.mascotCharacterId !== undefined) snakeCaseUpdates.mascot_character_id = updates.mascotCharacterId

      setLands(lands.map(l => l.id === landId ? { ...l, ...snakeCaseUpdates } : l))
      // Don't show notification for position updates (too noisy during drag)
      if (!updates.mapPositionX) {
        notifySuccess('Land updated')
      }
    } catch (error) {
      notifyError('Failed to update land')
    }
  }

  async function handleDeleteLand(landId) {
    if (!window.confirm('Delete this land and all its activities?')) return
    try {
      await learningWorldsAPI.deleteLand(landId)
      setLands(lands.filter(l => l.id !== landId))
      if (selectedLand?.id === landId) setSelectedLand(null)
      notifySuccess('Land deleted')
    } catch (error) {
      notifyError('Failed to delete land')
    }
  }

  async function handleCreateActivity(landId, activityData) {
    try {
      const response = await learningWorldsAPI.createActivity(landId, activityData)
      // Refresh lands to get updated activity count
      await loadWorld()
      setShowActivityModal(false)

      // AUTO-OPEN content editor for new activity
      if (response.activity) {
        setEditingActivity(response.activity)
        notifySuccess('Activity created! Now add some content.')
      } else {
        notifySuccess('Activity created!')
      }
    } catch (error) {
      notifyError('Failed to create activity')
    }
  }

  async function handleCreateCharacter(characterData) {
    try {
      const response = await learningWorldsAPI.createCharacter(worldId, characterData)
      setCharacters([...characters, response.character])
      setShowCharacterModal(false)
      notifySuccess('Character created!')
    } catch (error) {
      notifyError('Failed to create character')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  if (!world) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800">World not found</h2>
          <button
            onClick={() => navigate('/worlds')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
          >
            Back to Worlds
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/worlds')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{world.name}</h1>
                <p className="text-sm text-gray-500">Edit your world</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/worlds/${worldId}/play`)}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Preview
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - World Settings & Navigation */}
          <div className="lg:col-span-1 space-y-6">
            {/* World Settings Card */}
            <WorldSettingsCard
              world={world}
              onSave={handleSaveWorld}
              saving={saving}
            />

            {/* Navigation Tabs */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="flex border-b">
                {['lands', 'characters'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-4 py-3 font-medium capitalize transition-colors ${
                      activeTab === tab
                        ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-500'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {tab}
                    <span className="ml-2 text-sm bg-gray-200 px-2 py-0.5 rounded-full">
                      {tab === 'lands' ? lands.length : characters.length}
                    </span>
                  </button>
                ))}
              </div>

              <div className="p-4">
                {activeTab === 'lands' && (
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setSelectedLand(null)
                        setShowLandModal(true)
                      }}
                      className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Land
                    </button>

                    {lands.length === 0 ? (
                      <div className="text-center py-6 px-4">
                        <div className="text-3xl mb-2">🗺️</div>
                        <p className="text-gray-700 font-medium mb-1">Step 1: Create a Land</p>
                        <p className="text-gray-500 text-sm">
                          Lands are areas in your world where activities live.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {lands.map(land => (
                          <LandListItem
                            key={land.id}
                            land={land}
                            isSelected={selectedLand?.id === land.id}
                            onClick={() => setSelectedLand(land)}
                            onEdit={() => {
                              setSelectedLand(land)
                              setShowLandModal(true)
                            }}
                            onDelete={() => handleDeleteLand(land.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'characters' && (
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowCharacterModal(true)}
                      className="w-full px-4 py-3 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Character
                    </button>

                    {characters.length === 0 ? (
                      <div className="text-center py-6 px-4">
                        <div className="text-3xl mb-2">🎭</div>
                        <p className="text-gray-700 font-medium mb-1">Add a Guide Character</p>
                        <p className="text-gray-500 text-sm">
                          Characters make learning fun! Generate one with AI.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {characters.map(char => (
                          <CharacterListItem key={char.id} character={char} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Map Preview & Land Editor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Map Preview */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="font-semibold text-gray-800">Map Preview</h3>
                <p className="text-sm text-gray-500">Drag lands to reposition them on the map</p>
              </div>
              <MapPreview
                world={world}
                lands={lands}
                selectedLand={selectedLand}
                onSelectLand={setSelectedLand}
                onUpdateLandPosition={async (landId, x, y) => {
                  await handleUpdateLand(landId, { mapPositionX: x, mapPositionY: y })
                }}
              />
            </div>

            {/* Selected Land Editor */}
            {selectedLand && (
              <LandEditor
                land={selectedLand}
                characters={characters}
                onUpdate={(updates) => handleUpdateLand(selectedLand.id, updates)}
                onAddActivity={() => setShowActivityModal(true)}
                onEditContent={(activity) => setEditingActivity(activity)}
                onRefresh={loadWorld}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showLandModal && (
        <LandModal
          land={selectedLand}
          characters={characters}
          existingLands={lands}
          onSave={selectedLand ? (data) => handleUpdateLand(selectedLand.id, data) : handleCreateLand}
          onClose={() => {
            setShowLandModal(false)
            setSelectedLand(null)
          }}
        />
      )}

      {showActivityModal && selectedLand && (
        <ActivityModal
          landId={selectedLand.id}
          onSave={(data) => handleCreateActivity(selectedLand.id, data)}
          onClose={() => setShowActivityModal(false)}
        />
      )}

      {showCharacterModal && (
        <CharacterModal
          worldId={worldId}
          onSave={(character) => {
            // Character is already saved by backend for AI generation
            // or we need to save it for manual creation
            if (character.id) {
              // AI-generated character already saved
              setCharacters([...characters, character])
              setShowCharacterModal(false)
              notifySuccess('Character created!')
            } else {
              // Manual creation
              handleCreateCharacter(character)
            }
          }}
          onClose={() => setShowCharacterModal(false)}
        />
      )}

      {editingActivity && (
        <ActivityContentEditor
          activity={editingActivity}
          onSave={(content) => {
            setEditingActivity(null)
            loadWorld() // Refresh to show updated content
            notifySuccess('Activity content saved!')
          }}
          onClose={() => setEditingActivity(null)}
        />
      )}
    </div>
  )
}

/**
 * World Settings Card
 */
function WorldSettingsCard({ world, onSave, saving }) {
  const [name, setName] = useState(world.name)
  const [theme, setTheme] = useState(world.theme || 'fantasy')
  const [isEditing, setIsEditing] = useState(false)

  const themes = [
    { value: 'fantasy', label: 'Fantasy', icon: '🏰' },
    { value: 'ocean', label: 'Ocean', icon: '🌊' },
    { value: 'forest', label: 'Forest', icon: '🌲' },
    { value: 'space', label: 'Space', icon: '🚀' }
  ]

  function handleSave() {
    onSave({ name, theme })
    setIsEditing(false)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">World Settings</h3>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            Edit
          </button>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-sm bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
            <div className="grid grid-cols-2 gap-2">
              {themes.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTheme(t.value)}
                  className={`p-3 rounded-lg border-2 flex items-center gap-2 ${
                    theme === t.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{t.icon}</span>
                  <span className="font-medium">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gray-600">
            <span className="text-xl">{themes.find(t => t.value === theme)?.icon || '🌍'}</span>
            <span className="capitalize">{theme} Theme</span>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Map Preview with draggable land positions
 * Supports two interaction modes:
 * 1. Drag: Click and drag directly on a land marker to move it
 * 2. Click to place: Select a land from the list, then click anywhere on the map to move it
 */
function MapPreview({ world, lands, selectedLand, onSelectLand, onUpdateLandPosition }) {
  const containerRef = useRef(null)
  const [dragging, setDragging] = useState(null) // { landId, landName }
  const [dragPosition, setDragPosition] = useState(null) // { x, y } in percentage
  const [placementMode, setPlacementMode] = useState(false) // When true, clicking map places selected land

  const themes = {
    fantasy: { bg: 'from-indigo-900 via-purple-600 to-orange-300', ground: '#2d5a27' },
    ocean: { bg: 'from-sky-700 via-sky-400 to-cyan-200', ground: '#059669' },
    forest: { bg: 'from-teal-800 via-teal-500 to-green-200', ground: '#166534' },
    space: { bg: 'from-gray-900 via-indigo-900 to-purple-900', ground: '#4c1d95' }
  }
  const theme = themes[world.theme] || themes.fantasy

  // Convert pixel position to percentage
  const pixelToPercent = useCallback((clientX, clientY) => {
    if (!containerRef.current) return { x: 50, y: 50 }
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(10, Math.min(90, ((clientX - rect.left) / rect.width) * 100))
    const y = Math.max(15, Math.min(80, ((clientY - rect.top) / rect.height) * 100))
    return { x, y }
  }, [])

  // Handle drag start
  const handleDragStart = useCallback((e, land) => {
    e.preventDefault()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY

    setDragging({
      landId: land.id,
      landName: land.name
    })
    setDragPosition({
      x: land.map_position_x || 50,
      y: land.map_position_y || 50
    })
    onSelectLand(land)
  }, [onSelectLand])

  // Handle drag move
  const handleDragMove = useCallback((e) => {
    if (!dragging) return
    e.preventDefault()

    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const pos = pixelToPercent(clientX, clientY)
    setDragPosition(pos)
  }, [dragging, pixelToPercent])

  // Handle drag end
  const handleDragEnd = useCallback(async () => {
    if (!dragging || !dragPosition) return

    // Save the new position
    await onUpdateLandPosition(dragging.landId, dragPosition.x, dragPosition.y)

    setDragging(null)
    setDragPosition(null)
  }, [dragging, dragPosition, onUpdateLandPosition])

  // Add global mouse/touch listeners when dragging
  useEffect(() => {
    if (!dragging) return

    const handleMove = (e) => handleDragMove(e)
    const handleEnd = () => handleDragEnd()

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleEnd)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [dragging, handleDragMove, handleDragEnd])

  // Handle click on map background to place selected land
  const handleMapClick = useCallback(async (e) => {
    // Only handle if we have a selected land and clicked on the background (not a land marker)
    if (!selectedLand) return
    if (e.target !== containerRef.current && !e.target.classList.contains('map-background')) return

    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const pos = pixelToPercent(clientX, clientY)

    // Save the new position
    await onUpdateLandPosition(selectedLand.id, pos.x, pos.y)
  }, [selectedLand, pixelToPercent, onUpdateLandPosition])

  // Get position for a land (use drag position if currently dragging this land)
  const getLandPosition = (land) => {
    if (dragging?.landId === land.id && dragPosition) {
      return dragPosition
    }
    return {
      x: land.map_position_x || 50,
      y: land.map_position_y || 50
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative h-64 bg-gradient-to-b ${theme.bg} select-none map-background`}
      style={{
        minHeight: 256,
        cursor: dragging ? 'grabbing' : selectedLand ? 'crosshair' : 'default'
      }}
      onClick={handleMapClick}
      onTouchEnd={(e) => {
        // Handle touch placement on map background
        if (selectedLand && (e.target === containerRef.current || e.target.classList.contains('map-background'))) {
          const touch = e.changedTouches[0]
          if (touch) {
            const pos = pixelToPercent(touch.clientX, touch.clientY)
            onUpdateLandPosition(selectedLand.id, pos.x, pos.y)
          }
        }
      }}
    >
      {/* Ground - also clickable for placement */}
      <div
        className="absolute bottom-0 left-0 right-0 h-16 map-background"
        style={{ backgroundColor: theme.ground, opacity: 0.8 }}
      />

      {/* Instruction hint */}
      {lands.length > 0 && !dragging && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-black/40 text-white text-xs px-3 py-1 rounded-full">
          {selectedLand
            ? `Click anywhere to move "${selectedLand.name}" or drag it directly`
            : 'Select a land to reposition, or drag lands directly'
          }
        </div>
      )}

      {/* Dragging indicator */}
      {dragging && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-yellow-900 text-xs px-3 py-1 rounded-full font-medium animate-pulse">
          Moving {dragging.landName}...
        </div>
      )}

      {/* Land markers */}
      {lands.map(land => {
        const pos = getLandPosition(land)
        const isDragging = dragging?.landId === land.id

        return (
          <div
            key={land.id}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${
              isDragging
                ? 'z-50 scale-110'
                : selectedLand?.id === land.id
                  ? 'scale-110 z-10'
                  : 'hover:scale-105'
            }`}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              cursor: isDragging ? 'grabbing' : 'grab',
              transition: isDragging ? 'none' : 'transform 0.15s ease-out'
            }}
            onMouseDown={(e) => handleDragStart(e, land)}
            onTouchStart={(e) => handleDragStart(e, land)}
          >
            <div
              className={`w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center text-2xl border-4 transition-colors ${
                isDragging
                  ? 'border-yellow-400 shadow-2xl ring-4 ring-yellow-300/50'
                  : selectedLand?.id === land.id
                    ? 'border-blue-500'
                    : 'border-white hover:border-gray-200'
              }`}
            >
              {land.icon_url ? (
                <img src={land.icon_url} alt={land.name} className="w-10 h-10 pointer-events-none" />
              ) : (
                getDefaultIcon(land.slug)
              )}
            </div>
            <div className={`absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded text-xs font-medium shadow ${
              isDragging ? 'bg-yellow-100 text-yellow-900' : 'bg-white'
            }`}>
              {land.name}
            </div>
          </div>
        )
      })}

      {/* Empty state */}
      {lands.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-white text-center bg-black/30 rounded-2xl p-6 backdrop-blur-sm">
            <div className="text-4xl mb-3">🌍</div>
            <p className="text-lg font-medium">Your World Awaits</p>
            <p className="text-sm opacity-90 mt-1">Create your first land to start building</p>
          </div>
        </div>
      )}

      {/* Selected land indicator (shows on hover position) */}
      {selectedLand && !dragging && (
        <div className="absolute bottom-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded shadow">
          Selected: {selectedLand.name}
        </div>
      )}
    </div>
  )
}

function getDefaultIcon(slug) {
  const icons = {
    'animals': '🦁',
    'colors': '🌈',
    'food': '🍎',
    'numbers': '🔢',
    'shapes': '⭐',
    'weather': '☀️',
    'family': '👨‍👩‍👧‍👦',
    'ocean': '🐠',
    'space': '🚀'
  }
  return icons[slug?.split('-')[0]] || '🏝️'
}

/**
 * Land List Item
 */
function LandListItem({ land, isSelected, onClick, onEdit, onDelete }) {
  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getDefaultIcon(land.slug)}</span>
          <div>
            <h4 className="font-medium text-gray-800">{land.name}</h4>
            <p className="text-xs text-gray-500">
              {land.activity_count || 0} activities
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="p-1 hover:bg-red-100 rounded"
          >
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Character List Item
 */
function CharacterListItem({ character }) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  return (
    <div className="p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-xl relative overflow-hidden flex-shrink-0">
          {character.avatar_url && !imageError ? (
            <>
              {!imageLoaded && (
                <div className="absolute inset-0 bg-purple-100 animate-pulse flex items-center justify-center">
                  <span className="text-purple-400">...</span>
                </div>
              )}
              <img
                src={character.avatar_url}
                alt={character.name}
                className={`w-full h-full rounded-full object-cover transition-opacity ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            </>
          ) : (
            '🎭'
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-medium text-gray-800 truncate">{character.name}</h4>
          {character.species && (
            <p className="text-xs text-gray-400 capitalize">{character.species}</p>
          )}
          {character.catchphrase && (
            <p className="text-xs text-gray-500 italic truncate">"{character.catchphrase}"</p>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Land Editor Panel
 */
function LandEditor({ land, characters, onUpdate, onAddActivity, onEditContent, onRefresh }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadActivities()
  }, [land.id])

  async function loadActivities() {
    setLoading(true)
    try {
      const response = await learningWorldsAPI.getLand(land.id)
      setActivities(response.activities || [])
    } catch (error) {
      console.error('Failed to load activities:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteActivity(activityId) {
    if (!window.confirm('Delete this activity?')) return
    try {
      await learningWorldsAPI.deleteActivity(activityId)
      await loadActivities()
      onRefresh()
    } catch (error) {
      console.error('Failed to delete activity:', error)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-purple-500 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getDefaultIcon(land.slug)}</span>
            <div>
              <h3 className="font-bold text-lg">{land.name}</h3>
              <p className="text-sm opacity-90">{land.description || 'No description'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-800">Activities</h4>
          <button
            onClick={onAddActivity}
            className="px-3 py-1.5 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Activity
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-gray-500">Loading...</div>
        ) : activities.length === 0 ? (
          <div className="py-8 text-center bg-gradient-to-b from-blue-50 to-white rounded-lg border-2 border-dashed border-blue-200">
            <div className="text-3xl mb-2">🎯</div>
            <p className="text-gray-700 font-medium">Step 2: Add an Activity</p>
            <p className="text-gray-500 text-sm mb-3">Activities are learning games for students</p>
            <button
              onClick={onAddActivity}
              className="mt-2 text-blue-500 hover:text-blue-600"
            >
              Add your first activity
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map(activity => {
              const hasContent = activity.content && Object.keys(activity.content).length > 0
              const itemCount = activity.content?.items?.length ||
                               activity.content?.pairs?.length ||
                               activity.content?.actions?.length || 0

              return (
                <div
                  key={activity.id}
                  className="p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">
                        {ACTIVITY_TYPES[activity.activity_type]?.icon || '🎯'}
                      </span>
                      <div>
                        <h5 className="font-medium text-gray-800">{activity.title}</h5>
                        <p className="text-xs text-gray-500 capitalize">
                          {(activity.activity_type || 'unconfigured').replace(/_/g, ' ')}
                          {' • '}
                          Ages {activity.min_age_level || 1}-{activity.max_age_level || 3}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Content status badge */}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        hasContent
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {hasContent ? `${itemCount} items` : 'No content'}
                      </span>

                      {/* Edit Content button */}
                      <button
                        onClick={() => onEditContent(activity)}
                        className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 flex items-center gap-1"
                        title="Edit activity content"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>

                      {/* Delete button */}
                      <button
                        onClick={() => handleDeleteActivity(activity.id)}
                        className="p-1 hover:bg-red-100 rounded text-red-500"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Calculate non-overlapping position for a new land
 * Uses preset positions in a pleasing arrangement
 */
function calculateLandPosition(existingLands) {
  // Preset positions that don't overlap (max 8 lands)
  const presetPositions = [
    { x: 50, y: 45 },  // Center
    { x: 25, y: 35 },  // Top left
    { x: 75, y: 35 },  // Top right
    { x: 25, y: 60 },  // Bottom left
    { x: 75, y: 60 },  // Bottom right
    { x: 50, y: 25 },  // Top center
    { x: 15, y: 50 },  // Left center
    { x: 85, y: 50 },  // Right center
  ]

  // Find first unused position
  const usedPositions = existingLands.map(l => ({
    x: l.map_position_x,
    y: l.map_position_y
  }))

  for (const pos of presetPositions) {
    const isUsed = usedPositions.some(used =>
      Math.abs(used.x - pos.x) < 15 && Math.abs(used.y - pos.y) < 15
    )
    if (!isUsed) {
      return pos
    }
  }

  // If all preset positions used, find a random free spot
  for (let i = 0; i < 20; i++) {
    const x = 20 + Math.random() * 60
    const y = 25 + Math.random() * 45
    const isFree = !usedPositions.some(used =>
      Math.abs(used.x - x) < 18 && Math.abs(used.y - y) < 18
    )
    if (isFree) return { x, y }
  }

  // Fallback
  return { x: 50, y: 45 }
}

/**
 * Land Creation/Edit Modal
 */
function LandModal({ land, characters, existingLands = [], onSave, onClose }) {
  // Calculate auto position for new lands
  const autoPosition = !land ? calculateLandPosition(existingLands) : null

  const [name, setName] = useState(land?.name || '')
  const [slug, setSlug] = useState(land?.slug || '')
  const [description, setDescription] = useState(land?.description || '')
  const [introStory, setIntroStory] = useState(land?.intro_story || '')
  const [characterId, setCharacterId] = useState(land?.mascot_character_id || '')
  const [posX, setPosX] = useState(land?.map_position_x || autoPosition?.x || 50)
  const [posY, setPosY] = useState(land?.map_position_y || autoPosition?.y || 45)
  const [saving, setSaving] = useState(false)

  // Auto-generate slug from name
  useEffect(() => {
    if (!land && name) {
      setSlug(name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
    }
  }, [name, land])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    await onSave({
      name,
      slug,
      description,
      introStory,
      mascotCharacterId: characterId || null,
      mapPositionX: posX,
      mapPositionY: posY
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">
            {land ? 'Edit Land' : 'Create New Land'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g., Animals Land"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="animals-land"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Used for icons and theming</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="A fun place to learn about animals!"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Intro Story</label>
            <textarea
              value={introStory}
              onChange={(e) => setIntroStory(e.target.value)}
              rows={3}
              placeholder="What the character says when entering this land..."
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {characters.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Guide Character</label>
              <select
                value={characterId}
                onChange={(e) => setCharacterId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No guide</option>
                {characters.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Position controls - only show when editing existing land */}
          {land && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position X (%)</label>
                <input
                  type="number"
                  value={posX}
                  onChange={(e) => setPosX(Number(e.target.value))}
                  min={10}
                  max={90}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position Y (%)</label>
                <input
                  type="number"
                  value={posY}
                  onChange={(e) => setPosY(Number(e.target.value))}
                  min={20}
                  max={80}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Show auto-position info for new lands */}
          {!land && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                <span className="font-medium">Position:</span> Will be auto-placed on the map to avoid overlapping
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {saving ? 'Saving...' : land ? 'Save Changes' : 'Create Land'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * Activity Creation Modal
 */
function ActivityModal({ landId, onSave, onClose }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('vocabulary_touch')
  const [minAge, setMinAge] = useState(1)
  const [maxAge, setMaxAge] = useState(3)
  const [duration, setDuration] = useState(180)
  const [saving, setSaving] = useState(false)

  const activityTypes = Object.entries(ACTIVITY_TYPES).map(([key, config]) => ({
    value: key,
    label: config.name,
    icon: config.icon,
    description: config.description
  }))

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    await onSave({
      title,
      activityType: type,
      minAgeLevel: minAge,
      maxAgeLevel: maxAge,
      estimatedDurationSeconds: duration,
      content: {} // Empty content for now
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">Add Activity</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g., Meet the Animals"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Activity Type *</label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {activityTypes.map(at => (
                <button
                  key={at.value}
                  type="button"
                  onClick={() => setType(at.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    type === at.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{at.icon}</span>
                    <span className="font-medium text-sm">{at.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Age Level</label>
              <select
                value={minAge}
                onChange={(e) => setMinAge(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value={1}>Level 1 (4-6 yrs)</option>
                <option value={2}>Level 2 (7-8 yrs)</option>
                <option value={3}>Level 3 (9-10 yrs)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Age Level</label>
              <select
                value={maxAge}
                onChange={(e) => setMaxAge(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value={1}>Level 1 (4-6 yrs)</option>
                <option value={2}>Level 2 (7-8 yrs)</option>
                <option value={3}>Level 3 (9-10 yrs)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (seconds)
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              min={60}
              max={600}
              step={30}
              className="w-full px-3 py-2 border rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              {Math.ceil(duration / 60)} minutes
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * Character Creation Modal with AI Generation
 */
function CharacterModal({ worldId, onSave, onClose }) {
  const [mode, setMode] = useState('ai') // 'ai' or 'manual'
  const [theme, setTheme] = useState('')
  const [landContext, setLandContext] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatedCharacter, setGeneratedCharacter] = useState(null)
  const [error, setError] = useState(null)

  // Manual mode fields
  const [name, setName] = useState('')
  const [catchphrase, setCatchphrase] = useState('')
  const [personality, setPersonality] = useState('friendly')
  const [voiceStyle, setVoiceStyle] = useState('friendly')
  const [saving, setSaving] = useState(false)

  const personalities = [
    { value: 'friendly', label: 'Friendly', emoji: '😊' },
    { value: 'playful', label: 'Playful', emoji: '😄' },
    { value: 'wise', label: 'Wise', emoji: '🦉' },
    { value: 'adventurous', label: 'Adventurous', emoji: '🌟' }
  ]

  const themeExamples = [
    { label: 'Ocean Explorer', value: 'ocean adventure, marine life' },
    { label: 'Forest Friend', value: 'forest woodland, nature' },
    { label: 'Space Buddy', value: 'space exploration, astronaut' },
    { label: 'Safari Guide', value: 'safari animals, jungle' }
  ]

  async function handleGenerateCharacter() {
    setGenerating(true)
    setError(null)
    try {
      const response = await learningWorldsAPI.generateCharacter(worldId, {
        theme: theme || 'friendly educational helper',
        landContext: landContext || null
      })
      setGeneratedCharacter(response.character)
    } catch (err) {
      console.error('Character generation error:', err)
      setError(err.response?.data?.message || 'Failed to generate character')
    } finally {
      setGenerating(false)
    }
  }

  async function handleAcceptCharacter() {
    // Character is already saved by the backend, just close
    onSave(generatedCharacter)
  }

  async function handleRegenerateCharacter() {
    setGeneratedCharacter(null)
    await handleGenerateCharacter()
  }

  async function handleManualSubmit(e) {
    e.preventDefault()
    setSaving(true)
    await onSave({
      name,
      catchphrase,
      personalityTraits: [personality],
      voiceStyle
    })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">Create Character</h2>
        </div>

        {/* Mode Toggle */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('ai')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                mode === 'ai'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Generate with AI
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                mode === 'manual'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Create Manually
            </button>
          </div>
        </div>

        {/* AI Generation Mode */}
        {mode === 'ai' && !generatedCharacter && (
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Character Theme
              </label>
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="e.g., ocean adventure, friendly robot, wise owl..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {themeExamples.map(ex => (
                  <button
                    key={ex.value}
                    type="button"
                    onClick={() => setTheme(ex.value)}
                    className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Land Context (optional)
              </label>
              <input
                type="text"
                value={landContext}
                onChange={(e) => setLandContext(e.target.value)}
                placeholder="e.g., This character will guide students through Animal Land..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Describe where this character will appear for better results
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">
                  <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-sm text-purple-700">
                  <p className="font-medium">AI will generate:</p>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Unique character name and personality</li>
                    <li>Memorable catchphrase</li>
                    <li>Avatar image (Pixar-style)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateCharacter}
                disabled={generating}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 flex items-center gap-2"
              >
                {generating ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Generate Character
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Generated Character Preview */}
        {mode === 'ai' && generatedCharacter && (
          <div className="p-4 space-y-4">
            <div className="text-center">
              {generatedCharacter.avatar_url ? (
                <img
                  src={generatedCharacter.avatar_url}
                  alt={generatedCharacter.name}
                  className="w-32 h-32 mx-auto rounded-full object-cover border-4 border-purple-200 shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 mx-auto rounded-full bg-purple-100 flex items-center justify-center text-4xl border-4 border-purple-200">
                  🎭
                </div>
              )}
              <h3 className="text-xl font-bold text-gray-800 mt-3">{generatedCharacter.name}</h3>
              <p className="text-sm text-gray-500 capitalize">{generatedCharacter.species}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Catchphrase</span>
                <p className="text-gray-800 italic">"{generatedCharacter.catchphrase}"</p>
              </div>

              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Personality</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {generatedCharacter.personality_traits?.map((trait, i) => (
                    <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                      {trait}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-medium text-gray-500 uppercase">Voice Style</span>
                <p className="text-gray-800 capitalize">{generatedCharacter.voice_style}</p>
              </div>
            </div>

            <div className="flex justify-between gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={handleRegenerateCharacter}
                disabled={generating}
                className="px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg flex items-center gap-2"
              >
                {generating ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                Regenerate
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAcceptCharacter}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Accept Character
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Mode */}
        {mode === 'manual' && (
          <form onSubmit={handleManualSubmit} className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g., Leo the Lion"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catchphrase</label>
              <input
                type="text"
                value={catchphrase}
                onChange={(e) => setCatchphrase(e.target.value)}
                placeholder="e.g., Roooar! Let's learn together!"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Personality</label>
              <div className="grid grid-cols-2 gap-2">
                {personalities.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPersonality(p.value)}
                    className={`p-3 rounded-lg border-2 flex items-center gap-2 ${
                      personality === p.value
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xl">{p.emoji}</span>
                    <span className="font-medium">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !name}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Character'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
