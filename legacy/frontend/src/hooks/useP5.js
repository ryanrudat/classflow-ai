import { useRef, useEffect, useCallback } from 'react'
import p5 from 'p5'

/**
 * Custom hook for integrating P5.js with React
 * Handles canvas lifecycle, cleanup, and responsive resizing
 *
 * @param {Function} sketch - P5.js sketch function (p, props) => void
 * @param {Object} props - Props to pass to the sketch
 * @param {Object} options - Configuration options
 * @returns {Object} - Ref to attach to container div
 */
export function useP5(sketch, props = {}, options = {}) {
  const containerRef = useRef(null)
  const p5InstanceRef = useRef(null)
  const propsRef = useRef(props)

  // Keep props ref updated
  useEffect(() => {
    propsRef.current = props
  }, [props])

  // Initialize and cleanup P5.js instance
  useEffect(() => {
    if (!containerRef.current || !sketch) return

    // Create P5.js instance in instance mode
    p5InstanceRef.current = new p5((p) => {
      // Store reference to props that updates
      p.props = propsRef.current

      // Create wrapper that calls user's sketch with current props
      const wrappedSetup = () => {
        if (sketch.setup) {
          sketch.setup(p, propsRef.current)
        }
      }

      const wrappedDraw = () => {
        // Update props reference on each frame
        p.props = propsRef.current
        if (sketch.draw) {
          sketch.draw(p, propsRef.current)
        }
      }

      // Apply sketch functions
      p.setup = wrappedSetup
      p.draw = wrappedDraw

      // Pass through other event handlers
      if (sketch.mousePressed) p.mousePressed = () => sketch.mousePressed(p, propsRef.current)
      if (sketch.mouseReleased) p.mouseReleased = () => sketch.mouseReleased(p, propsRef.current)
      if (sketch.mouseMoved) p.mouseMoved = () => sketch.mouseMoved(p, propsRef.current)
      if (sketch.mouseDragged) p.mouseDragged = () => sketch.mouseDragged(p, propsRef.current)
      if (sketch.touchStarted) p.touchStarted = () => sketch.touchStarted(p, propsRef.current)
      if (sketch.touchMoved) p.touchMoved = () => sketch.touchMoved(p, propsRef.current)
      if (sketch.touchEnded) p.touchEnded = () => sketch.touchEnded(p, propsRef.current)
      if (sketch.windowResized) p.windowResized = () => sketch.windowResized(p, propsRef.current)

    }, containerRef.current)

    // Cleanup on unmount
    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove()
        p5InstanceRef.current = null
      }
    }
  }, [sketch])

  return { containerRef, p5Instance: p5InstanceRef }
}

/**
 * Get the P5.js instance for external control
 */
export function useP5Instance() {
  const p5Ref = useRef(null)

  const setP5Instance = useCallback((instance) => {
    p5Ref.current = instance
  }, [])

  return { p5Ref, setP5Instance }
}

export default useP5
