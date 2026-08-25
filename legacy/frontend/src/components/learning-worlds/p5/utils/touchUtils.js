/**
 * Touch Utilities for P5.js Activities
 * Provides touch-friendly interaction helpers for young children
 */

/**
 * Minimum touch target sizes by age level (in pixels)
 */
export const TOUCH_TARGET_SIZES = {
  1: 80,  // Ages 4-6: Large targets
  2: 64,  // Ages 7-8: Medium targets
  3: 48   // Ages 9-10: Standard targets
}

/**
 * Get appropriate touch target size for age level
 */
export function getTouchTargetSize(ageLevel) {
  return TOUCH_TARGET_SIZES[ageLevel] || TOUCH_TARGET_SIZES[2]
}

/**
 * Check if a point is within a circular touch target
 */
export function isInCircle(px, py, cx, cy, radius) {
  const dx = px - cx
  const dy = py - cy
  return (dx * dx + dy * dy) <= (radius * radius)
}

/**
 * Check if a point is within a rectangular touch target
 */
export function isInRect(px, py, rx, ry, rw, rh) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh
}

/**
 * Create a debounced touch handler
 * Prevents accidental double-taps
 */
export function createDebouncedTouchHandler(handler, delay = 300) {
  let lastTouchTime = 0

  return function(p, props, ...args) {
    const now = Date.now()
    if (now - lastTouchTime >= delay) {
      lastTouchTime = now
      return handler(p, props, ...args)
    }
    return false
  }
}

/**
 * Get all touch points from P5.js
 * Normalizes mouse and touch input
 */
export function getTouchPoints(p) {
  if (p.touches && p.touches.length > 0) {
    return p.touches.map(t => ({ x: t.x, y: t.y }))
  }
  return [{ x: p.mouseX, y: p.mouseY }]
}

/**
 * Check if touch/mouse is currently pressed
 */
export function isTouching(p) {
  return p.mouseIsPressed || (p.touches && p.touches.length > 0)
}

/**
 * Calculate distance between two points
 */
export function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

/**
 * Smooth a value over time (for animations)
 */
export function smoothValue(current, target, smoothing = 0.1) {
  return current + (target - current) * smoothing
}

/**
 * Clamp a value between min and max
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

/**
 * Map a value from one range to another
 */
export function mapRange(value, inMin, inMax, outMin, outMax) {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin
}

/**
 * Touch target helper class
 * Tracks interaction state and provides visual feedback
 */
export class TouchTarget {
  constructor(x, y, size, options = {}) {
    this.x = x
    this.y = y
    this.size = size
    this.isHovered = false
    this.isPressed = false
    this.wasPressed = false
    this.onTap = options.onTap || null
    this.shape = options.shape || 'circle' // 'circle' or 'rect'
    this.data = options.data || null
  }

  update(p) {
    this.wasPressed = this.isPressed

    const touchPoints = getTouchPoints(p)
    let isOverTarget = false

    for (const point of touchPoints) {
      if (this.shape === 'circle') {
        if (isInCircle(point.x, point.y, this.x, this.y, this.size / 2)) {
          isOverTarget = true
          break
        }
      } else {
        if (isInRect(point.x, point.y, this.x - this.size / 2, this.y - this.size / 2, this.size, this.size)) {
          isOverTarget = true
          break
        }
      }
    }

    this.isHovered = isOverTarget
    this.isPressed = isOverTarget && isTouching(p)

    // Detect tap (was pressed, now released)
    if (this.wasPressed && !this.isPressed && this.isHovered && this.onTap) {
      this.onTap(this.data)
      return true
    }

    return false
  }

  // Get scale factor for visual feedback
  getScale() {
    if (this.isPressed) return 0.95
    if (this.isHovered) return 1.05
    return 1.0
  }
}

/**
 * Multi-touch tracker for collaborative activities
 */
export class MultiTouchTracker {
  constructor(maxTouches = 2) {
    this.maxTouches = maxTouches
    this.activeTouches = new Map()
  }

  update(p) {
    const currentTouches = new Map()

    if (p.touches && p.touches.length > 0) {
      p.touches.slice(0, this.maxTouches).forEach((touch, i) => {
        currentTouches.set(i, { x: touch.x, y: touch.y, id: i })
      })
    } else if (p.mouseIsPressed) {
      currentTouches.set(0, { x: p.mouseX, y: p.mouseY, id: 0 })
    }

    this.activeTouches = currentTouches
    return Array.from(currentTouches.values())
  }

  getTouchCount() {
    return this.activeTouches.size
  }
}
