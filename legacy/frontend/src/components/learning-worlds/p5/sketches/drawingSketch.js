/**
 * Drawing Sketch for P5.js
 * Free drawing canvas for creative activities
 */

// Drawing storage
let strokes = []
let currentStroke = null
let currentColor = '#000000'
let brushSize = 12
let isDrawing = false
let undoStack = []

/**
 * Drawing Sketch
 */
export const drawingSketch = {
  setup(p, props) {
    const {
      backgroundColor = '#FFFFFF',
      initialColor = '#000000',
      initialBrushSize = 12
    } = props

    strokes = []
    currentStroke = null
    currentColor = initialColor
    brushSize = initialBrushSize
    isDrawing = false
    undoStack = []

    // Clear canvas with background
    p.background(backgroundColor)
  },

  draw(p, props) {
    const { backgroundColor = '#FFFFFF' } = props

    // Redraw all strokes
    p.background(backgroundColor)

    strokes.forEach(stroke => {
      drawStroke(p, stroke)
    })

    // Draw current stroke being made
    if (currentStroke && currentStroke.points.length > 1) {
      drawStroke(p, currentStroke)
    }
  },

  touchStarted(p, props) {
    isDrawing = true
    currentStroke = {
      points: [{ x: p.mouseX, y: p.mouseY }],
      color: currentColor,
      size: brushSize
    }
  },

  touchMoved(p, props) {
    if (!isDrawing || !currentStroke) return

    currentStroke.points.push({ x: p.mouseX, y: p.mouseY })
  },

  touchEnded(p, props) {
    if (currentStroke && currentStroke.points.length > 0) {
      strokes.push(currentStroke)
      undoStack = [] // Clear redo stack on new stroke
    }
    currentStroke = null
    isDrawing = false
  },

  mousePressed(p, props) {
    this.touchStarted(p, props)
  },

  mouseDragged(p, props) {
    this.touchMoved(p, props)
  },

  mouseReleased(p, props) {
    this.touchEnded(p, props)
  },

  // External API methods
  setColor(color) {
    currentColor = color
  },

  setBrushSize(size) {
    brushSize = size
  },

  undo() {
    if (strokes.length > 0) {
      undoStack.push(strokes.pop())
      return true
    }
    return false
  },

  redo() {
    if (undoStack.length > 0) {
      strokes.push(undoStack.pop())
      return true
    }
    return false
  },

  clear() {
    strokes = []
    undoStack = []
  },

  getDrawingData() {
    return {
      strokes: strokes,
      canUndo: strokes.length > 0,
      canRedo: undoStack.length > 0
    }
  },

  hasDrawing() {
    return strokes.length > 0
  }
}

/**
 * Draw a single stroke
 */
function drawStroke(p, stroke) {
  if (stroke.points.length < 2) return

  p.stroke(stroke.color)
  p.strokeWeight(stroke.size)
  p.strokeCap(p.ROUND)
  p.strokeJoin(p.ROUND)
  p.noFill()

  p.beginShape()
  stroke.points.forEach(pt => {
    p.curveVertex(pt.x, pt.y)
  })
  p.endShape()
}

/**
 * Color palette for children
 */
export const DRAWING_COLORS = [
  { name: 'Black', value: '#000000' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Brown', value: '#92400E' },
  { name: 'White', value: '#FFFFFF' }
]

/**
 * Brush sizes by age level
 */
export const BRUSH_SIZES = {
  1: [16, 24, 32], // Large for young kids
  2: [12, 18, 24], // Medium
  3: [8, 12, 16]   // Standard
}

export default drawingSketch
