import { useState, useRef, useCallback } from 'react'
import { useAudioManager } from '../../../hooks/useAudioManager'
import P5Canvas from '../p5/P5Canvas'
import { drawingSketch, DRAWING_COLORS, BRUSH_SIZES } from '../p5/sketches/drawingSketch'

/**
 * Drawing Activity
 *
 * Free drawing canvas for creative expression.
 * Features color palette, brush sizes, and undo/redo.
 */
export default function DrawingActivity({
  activity,
  content,
  ageLevel,
  controlMode,
  touchTargetSize,
  onComplete
}) {
  const audioManager = useAudioManager()
  const playTap = audioManager?.playTap
  const playSuccess = audioManager?.playSuccess

  const safeContent = content || {}
  const prompt = safeContent.prompt || 'Draw whatever you like!'

  const [selectedColor, setSelectedColor] = useState(DRAWING_COLORS[0].value)
  const [selectedSize, setSelectedSize] = useState(BRUSH_SIZES[ageLevel]?.[1] || 16)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)

  const sketchRef = useRef(drawingSketch)

  // Color palette button size based on age
  const buttonSize = ageLevel === 1 ? 'w-12 h-12' : ageLevel === 2 ? 'w-10 h-10' : 'w-8 h-8'
  const brushSizes = BRUSH_SIZES[ageLevel] || BRUSH_SIZES[2]

  const handleColorChange = useCallback((color) => {
    playTap?.()
    setSelectedColor(color)
    sketchRef.current.setColor?.(color)
  }, [playTap])

  const handleSizeChange = useCallback((size) => {
    playTap?.()
    setSelectedSize(size)
    sketchRef.current.setBrushSize?.(size)
  }, [playTap])

  const handleUndo = useCallback(() => {
    playTap?.()
    const result = sketchRef.current.undo?.()
    updateButtonStates()
  }, [playTap])

  const handleRedo = useCallback(() => {
    playTap?.()
    sketchRef.current.redo?.()
    updateButtonStates()
  }, [playTap])

  const handleClear = useCallback(() => {
    playTap?.()
    sketchRef.current.clear?.()
    updateButtonStates()
  }, [playTap])

  const handleDone = useCallback(() => {
    playSuccess?.()
    onComplete({
      score: 1,
      maxScore: 1,
      starsEarned: 3,
      hasDrawing: sketchRef.current.hasDrawing?.() || false
    })
  }, [playSuccess, onComplete])

  function updateButtonStates() {
    const data = sketchRef.current.getDrawingData?.()
    if (data) {
      setCanUndo(data.canUndo)
      setCanRedo(data.canRedo)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with prompt */}
      <div className="p-4 text-center bg-white/80 backdrop-blur-sm">
        <p className={`text-gray-700 font-medium ${ageLevel === 1 ? 'text-xl' : 'text-lg'}`}>
          {prompt}
        </p>
      </div>

      {/* Canvas area */}
      <div className="flex-1 relative bg-white">
        <P5Canvas
          sketch={sketchRef.current}
          props={{
            backgroundColor: '#FFFFFF',
            initialColor: selectedColor,
            initialBrushSize: selectedSize
          }}
          frameRate={60}
        />
      </div>

      {/* Toolbar */}
      <div className="bg-white border-t border-gray-200 p-3 space-y-3">
        {/* Color palette */}
        <div className="flex justify-center gap-2 flex-wrap">
          {DRAWING_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => handleColorChange(color.value)}
              className={`
                ${buttonSize} rounded-full border-4 transition-transform
                ${selectedColor === color.value
                  ? 'border-gray-800 scale-110'
                  : 'border-gray-200 hover:border-gray-400'
                }
              `}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>

        {/* Brush sizes and actions */}
        <div className="flex items-center justify-between">
          {/* Brush sizes */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 mr-1">Size:</span>
            {brushSizes.map((size) => (
              <button
                key={size}
                onClick={() => handleSizeChange(size)}
                className={`
                  rounded-full bg-gray-800 transition-transform
                  ${selectedSize === size
                    ? 'ring-2 ring-blue-500 ring-offset-2 scale-110'
                    : 'hover:scale-105'
                  }
                `}
                style={{ width: size + 8, height: size + 8 }}
                title={`Brush size ${size}`}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className={`
                px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${canUndo
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                }
              `}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>

            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className={`
                px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${canRedo
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                }
              `}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
              </svg>
            </button>

            <button
              onClick={handleClear}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
            >
              Clear
            </button>

            <button
              onClick={handleDone}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
            >
              Done!
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
