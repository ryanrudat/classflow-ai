import { useRef, useEffect, useState } from 'react'
import p5 from 'p5'

/**
 * P5Canvas - Reusable P5.js canvas wrapper for React
 *
 * Features:
 * - Touch-friendly with age-adaptive sizing
 * - Fullscreen or contained modes
 * - Loading states
 * - Responsive resizing
 * - Clean lifecycle management
 */
export default function P5Canvas({
  sketch,
  props = {},
  className = '',
  fullscreen = false,
  transparent = true,
  frameRate = 60,
  onReady,
  onError
}) {
  const containerRef = useRef(null)
  const p5InstanceRef = useRef(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!containerRef.current || !sketch) return

    try {
      // Create P5.js instance
      p5InstanceRef.current = new p5((p) => {
        // Store props reference that can be updated
        p.props = props

        // Setup function
        p.setup = () => {
          const container = containerRef.current
          if (!container) return

          const width = fullscreen ? p.windowWidth : container.clientWidth
          const height = fullscreen ? p.windowHeight : container.clientHeight

          const canvas = p.createCanvas(width, height)
          canvas.parent(container)

          if (transparent) {
            p.clear()
          }

          p.frameRate(frameRate)

          // Call sketch's setup if provided
          if (sketch.setup) {
            sketch.setup(p, props)
          }

          setIsReady(true)
          onReady?.()
        }

        // Draw function
        p.draw = () => {
          // Update props on each frame
          p.props = props

          if (transparent) {
            p.clear()
          }

          if (sketch.draw) {
            sketch.draw(p, props)
          }
        }

        // Window resize handler
        p.windowResized = () => {
          const container = containerRef.current
          if (!container) return

          const width = fullscreen ? p.windowWidth : container.clientWidth
          const height = fullscreen ? p.windowHeight : container.clientHeight
          p.resizeCanvas(width, height)

          if (sketch.windowResized) {
            sketch.windowResized(p, props)
          }
        }

        // Touch/Mouse event handlers
        if (sketch.mousePressed) {
          p.mousePressed = () => sketch.mousePressed(p, props)
        }
        if (sketch.mouseReleased) {
          p.mouseReleased = () => sketch.mouseReleased(p, props)
        }
        if (sketch.mouseDragged) {
          p.mouseDragged = () => sketch.mouseDragged(p, props)
        }
        if (sketch.touchStarted) {
          p.touchStarted = () => {
            sketch.touchStarted(p, props)
            return false // Prevent default
          }
        }
        if (sketch.touchMoved) {
          p.touchMoved = () => {
            sketch.touchMoved(p, props)
            return false // Prevent default
          }
        }
        if (sketch.touchEnded) {
          p.touchEnded = () => {
            sketch.touchEnded(p, props)
            return false // Prevent default
          }
        }

      }, containerRef.current)

    } catch (err) {
      console.error('P5Canvas error:', err)
      setError(err)
      onError?.(err)
    }

    // Cleanup
    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove()
        p5InstanceRef.current = null
      }
    }
  }, [sketch, fullscreen, transparent, frameRate])

  // Update props without recreating instance
  useEffect(() => {
    if (p5InstanceRef.current) {
      p5InstanceRef.current.props = props
    }
  }, [props])

  if (error) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <p className="text-red-500">Canvas error</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`${fullscreen ? 'fixed inset-0' : 'w-full h-full'} ${className}`}
      style={{ touchAction: 'none' }} // Prevent browser touch gestures
    />
  )
}

/**
 * P5Overlay - P5.js canvas as an overlay on top of other content
 * Useful for celebration effects, feedback particles, etc.
 */
export function P5Overlay({
  sketch,
  props = {},
  className = '',
  duration,
  onComplete
}) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => {
        setVisible(false)
        onComplete?.()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onComplete])

  if (!visible) return null

  return (
    <div className={`absolute inset-0 pointer-events-none z-50 ${className}`}>
      <P5Canvas
        sketch={sketch}
        props={props}
        fullscreen={false}
        transparent={true}
      />
    </div>
  )
}
