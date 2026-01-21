import { useState, useEffect } from 'react'
import { useAudioManager } from '../../../hooks/useAudioManager'

/**
 * Coloring Activity
 *
 * Students touch sections to fill them with colors.
 * - Simple coloring book style
 * - Touch to color sections
 * - Learn color words while coloring
 */
export default function ColoringActivity({
  activity,
  content,
  ageLevel,
  controlMode,
  onComplete
}) {
  const audioManager = useAudioManager()
  const playTap = audioManager?.playTap
  const playSuccess = audioManager?.playSuccess
  const playWord = audioManager?.playWord

  // Safely extract coloring data from content
  const safeContent = content || {}
  const sections = Array.isArray(safeContent.sections) ? safeContent.sections
    : Array.isArray(safeContent.items) ? safeContent.items
    : []
  const availableColors = safeContent.colors || [
    { name: 'red', hex: '#ef4444' },
    { name: 'blue', hex: '#3b82f6' },
    { name: 'yellow', hex: '#eab308' },
    { name: 'green', hex: '#22c55e' },
    { name: 'orange', hex: '#f97316' },
    { name: 'purple', hex: '#a855f7' },
    { name: 'pink', hex: '#ec4899' },
    { name: 'brown', hex: '#a16207' }
  ]

  const [selectedColor, setSelectedColor] = useState(availableColors[0])
  const [coloredSections, setColoredSections] = useState({})

  function handleColorSelect(color) {
    playTap?.()
    setSelectedColor(color)

    // Play color word audio
    if (color.audioUrl) {
      playWord?.(color.audioUrl)
    }
  }

  function handleSectionClick(sectionId) {
    if (controlMode === 'teacher') return

    playTap?.()
    setColoredSections(prev => ({
      ...prev,
      [sectionId]: selectedColor.hex
    }))
  }

  // Check completion (all sections colored)
  useEffect(() => {
    if (Object.keys(coloredSections).length === sections.length && sections.length > 0) {
      setTimeout(() => {
        playSuccess?.()
        onComplete?.({
          score: sections.length,
          maxScore: sections.length,
          starsEarned: 3,
          coloredSections
        })
      }, 1000)
    }
  }, [coloredSections, sections.length, playSuccess, onComplete])

  const colorButtonSize = ageLevel === 1 ? 'w-16 h-16' : ageLevel === 2 ? 'w-14 h-14' : 'w-12 h-12'

  return (
    <div className="h-full flex flex-col items-center justify-center p-4">
      {/* Instructions */}
      <div className="mb-4 text-center">
        <p className={`text-gray-700 font-medium ${ageLevel === 1 ? 'text-xl' : 'text-lg'}`}>
          {safeContent.instructions || 'Touch a color, then touch to paint!'}
        </p>
      </div>

      {/* Color Palette */}
      <div className="mb-6 flex flex-wrap justify-center gap-3 p-4 bg-white rounded-2xl shadow-lg">
        {availableColors.map(color => (
          <button
            key={color.name}
            onClick={() => handleColorSelect(color)}
            className={`
              ${colorButtonSize}
              rounded-full transition-all duration-200
              focus:outline-none
              ${selectedColor.name === color.name
                ? 'ring-4 ring-gray-800 ring-offset-2 scale-110'
                : 'hover:scale-105'
              }
            `}
            style={{ backgroundColor: color.hex }}
            title={color.name}
          />
        ))}
      </div>

      {/* Selected Color Label */}
      <div className="mb-4 text-center">
        <span
          className={`font-bold capitalize ${ageLevel === 1 ? 'text-2xl' : 'text-xl'}`}
          style={{ color: selectedColor.hex }}
        >
          {selectedColor.name}
        </span>
      </div>

      {/* Coloring Canvas */}
      <div className="bg-white rounded-2xl shadow-xl p-4 max-w-2xl w-full">
        {safeContent.imageUrl ? (
          // SVG-based coloring (if provided)
          <ColoringSVG
            imageUrl={safeContent.imageUrl}
            sections={sections}
            coloredSections={coloredSections}
            onSectionClick={handleSectionClick}
            controlMode={controlMode}
          />
        ) : (
          // Simple grid-based coloring (default)
          <SimpleColoringGrid
            sections={sections}
            coloredSections={coloredSections}
            onSectionClick={handleSectionClick}
            controlMode={controlMode}
            ageLevel={ageLevel}
          />
        )}
      </div>

      {/* Progress */}
      <div className="mt-4 text-center">
        <p className="text-gray-500 text-sm">
          {Object.keys(coloredSections).length} / {sections.length} sections colored
        </p>
      </div>
    </div>
  )
}

/**
 * Simple Coloring Grid (default when no SVG provided)
 */
function SimpleColoringGrid({ sections, coloredSections, onSectionClick, controlMode, ageLevel }) {
  // Default sections if none provided
  const defaultSections = [
    { id: '1', label: 'Sky', defaultColor: '#e0f2fe' },
    { id: '2', label: 'Sun', defaultColor: '#fef9c3' },
    { id: '3', label: 'Tree', defaultColor: '#dcfce7' },
    { id: '4', label: 'House', defaultColor: '#fce7f3' },
    { id: '5', label: 'Grass', defaultColor: '#d1fae5' },
    { id: '6', label: 'Flower', defaultColor: '#fef3c7' }
  ]

  const actualSections = sections.length > 0 ? sections : defaultSections
  const canTouch = controlMode !== 'teacher'

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {actualSections.map(section => (
        <button
          key={section.id}
          onClick={() => onSectionClick(section.id)}
          disabled={!canTouch}
          className={`
            aspect-square rounded-xl border-2 border-dashed border-gray-300
            transition-all duration-200
            flex items-center justify-center
            ${canTouch ? 'cursor-pointer hover:border-gray-400' : 'cursor-default'}
          `}
          style={{
            backgroundColor: coloredSections[section.id] || section.defaultColor || '#f9fafb'
          }}
        >
          {!coloredSections[section.id] && (
            <span className={`text-gray-400 font-medium ${ageLevel === 1 ? 'text-lg' : 'text-base'}`}>
              {section.label}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

/**
 * SVG-based Coloring (for custom images)
 */
function ColoringSVG({ imageUrl, sections, coloredSections, onSectionClick, controlMode }) {
  // This would load and render an SVG with clickable paths
  // For now, just show the image as a placeholder

  return (
    <div className="relative">
      <img
        src={imageUrl}
        alt="Coloring page"
        className="w-full h-auto"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="bg-white/80 px-4 py-2 rounded-lg text-gray-600">
          SVG coloring coming soon!
        </p>
      </div>
    </div>
  )
}
