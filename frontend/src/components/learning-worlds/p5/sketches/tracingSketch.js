/**
 * Tracing Sketch for P5.js
 * Allows children to trace letters and words with finger feedback
 */

// Path storage
let guidePath = []
let userPath = []
let traceProgress = 0
let isTracing = false
let sparkles = []
let completionCallback = null

/**
 * Generate letter path points for tracing
 */
function generateLetterPath(p, letter, centerX, centerY, size) {
  const points = []
  const scale = size / 100

  // Simple path definitions for common letters
  const letterPaths = {
    'A': [
      { x: 0, y: 100 }, { x: 50, y: 0 }, { x: 100, y: 100 },
      { x: 75, y: 50 }, { x: 25, y: 50 }
    ],
    'B': [
      { x: 0, y: 0 }, { x: 0, y: 100 }, { x: 0, y: 50 },
      { x: 60, y: 35 }, { x: 0, y: 50 },
      { x: 60, y: 75 }, { x: 0, y: 100 }
    ],
    'C': [
      { x: 80, y: 20 }, { x: 40, y: 0 }, { x: 0, y: 50 },
      { x: 40, y: 100 }, { x: 80, y: 80 }
    ],
    'D': [
      { x: 0, y: 0 }, { x: 0, y: 100 },
      { x: 60, y: 80 }, { x: 80, y: 50 }, { x: 60, y: 20 }, { x: 0, y: 0 }
    ],
    'E': [
      { x: 80, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 50 },
      { x: 60, y: 50 }, { x: 0, y: 50 }, { x: 0, y: 100 }, { x: 80, y: 100 }
    ],
    'F': [
      { x: 80, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 50 },
      { x: 60, y: 50 }, { x: 0, y: 50 }, { x: 0, y: 100 }
    ],
    'G': [
      { x: 80, y: 20 }, { x: 40, y: 0 }, { x: 0, y: 50 },
      { x: 40, y: 100 }, { x: 80, y: 80 }, { x: 80, y: 50 }, { x: 50, y: 50 }
    ],
    'H': [
      { x: 0, y: 0 }, { x: 0, y: 100 }, { x: 0, y: 50 },
      { x: 80, y: 50 }, { x: 80, y: 0 }, { x: 80, y: 100 }
    ],
    'I': [
      { x: 0, y: 0 }, { x: 80, y: 0 }, { x: 40, y: 0 },
      { x: 40, y: 100 }, { x: 0, y: 100 }, { x: 80, y: 100 }
    ],
    'J': [
      { x: 20, y: 0 }, { x: 80, y: 0 }, { x: 50, y: 0 },
      { x: 50, y: 80 }, { x: 30, y: 100 }, { x: 0, y: 80 }
    ],
    'K': [
      { x: 0, y: 0 }, { x: 0, y: 100 }, { x: 0, y: 50 },
      { x: 80, y: 0 }, { x: 0, y: 50 }, { x: 80, y: 100 }
    ],
    'L': [
      { x: 0, y: 0 }, { x: 0, y: 100 }, { x: 80, y: 100 }
    ],
    'M': [
      { x: 0, y: 100 }, { x: 0, y: 0 }, { x: 40, y: 50 },
      { x: 80, y: 0 }, { x: 80, y: 100 }
    ],
    'N': [
      { x: 0, y: 100 }, { x: 0, y: 0 }, { x: 80, y: 100 }, { x: 80, y: 0 }
    ],
    'O': [
      { x: 40, y: 0 }, { x: 0, y: 25 }, { x: 0, y: 75 },
      { x: 40, y: 100 }, { x: 80, y: 75 }, { x: 80, y: 25 }, { x: 40, y: 0 }
    ],
    'P': [
      { x: 0, y: 100 }, { x: 0, y: 0 },
      { x: 60, y: 15 }, { x: 60, y: 35 }, { x: 0, y: 50 }
    ],
    'Q': [
      { x: 40, y: 0 }, { x: 0, y: 25 }, { x: 0, y: 75 },
      { x: 40, y: 100 }, { x: 80, y: 75 }, { x: 80, y: 25 }, { x: 40, y: 0 },
      { x: 50, y: 70 }, { x: 90, y: 110 }
    ],
    'R': [
      { x: 0, y: 100 }, { x: 0, y: 0 },
      { x: 60, y: 15 }, { x: 60, y: 35 }, { x: 0, y: 50 },
      { x: 70, y: 100 }
    ],
    'S': [
      { x: 70, y: 15 }, { x: 40, y: 0 }, { x: 10, y: 15 },
      { x: 10, y: 35 }, { x: 70, y: 65 }, { x: 70, y: 85 },
      { x: 40, y: 100 }, { x: 10, y: 85 }
    ],
    'T': [
      { x: 0, y: 0 }, { x: 80, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 100 }
    ],
    'U': [
      { x: 0, y: 0 }, { x: 0, y: 75 }, { x: 40, y: 100 },
      { x: 80, y: 75 }, { x: 80, y: 0 }
    ],
    'V': [
      { x: 0, y: 0 }, { x: 40, y: 100 }, { x: 80, y: 0 }
    ],
    'W': [
      { x: 0, y: 0 }, { x: 20, y: 100 }, { x: 40, y: 50 },
      { x: 60, y: 100 }, { x: 80, y: 0 }
    ],
    'X': [
      { x: 0, y: 0 }, { x: 80, y: 100 }, { x: 40, y: 50 },
      { x: 0, y: 100 }, { x: 80, y: 0 }
    ],
    'Y': [
      { x: 0, y: 0 }, { x: 40, y: 50 }, { x: 80, y: 0 },
      { x: 40, y: 50 }, { x: 40, y: 100 }
    ],
    'Z': [
      { x: 0, y: 0 }, { x: 80, y: 0 }, { x: 0, y: 100 }, { x: 80, y: 100 }
    ]
  }

  const path = letterPaths[letter.toUpperCase()] || letterPaths['A']

  // Scale and position the path
  path.forEach(pt => {
    points.push({
      x: centerX - (size / 2) + (pt.x * scale),
      y: centerY - (size / 2) + (pt.y * scale)
    })
  })

  return points
}

/**
 * Create sparkle at position
 */
class TraceSparkle {
  constructor(p, x, y) {
    this.p = p
    this.x = x
    this.y = y
    this.size = p.random(4, 10)
    this.alpha = 255
    this.vx = p.random(-2, 2)
    this.vy = p.random(-3, -1)
    this.color = p.color(255, 215, 0) // Gold
  }

  update() {
    this.x += this.vx
    this.y += this.vy
    this.alpha -= 8
    this.size *= 0.96
  }

  display() {
    const p = this.p
    p.push()
    p.noStroke()
    p.fill(p.red(this.color), p.green(this.color), p.blue(this.color), this.alpha)
    p.ellipse(this.x, this.y, this.size)
    p.pop()
  }

  isDead() {
    return this.alpha <= 0
  }
}

/**
 * Letter Tracing Sketch
 */
export const tracingSketch = {
  setup(p, props) {
    const { letter = 'A', letterSize = 300, onComplete } = props

    guidePath = generateLetterPath(p, letter, p.width / 2, p.height / 2, letterSize)
    userPath = []
    traceProgress = 0
    isTracing = false
    sparkles = []
    completionCallback = onComplete
  },

  draw(p, props) {
    const { guideColor = '#E5E7EB', strokeColor = '#3B82F6', strokeWidth = 20 } = props

    // Draw guide path (dotted line)
    p.stroke(guideColor)
    p.strokeWeight(strokeWidth + 4)
    p.noFill()
    p.beginShape()
    guidePath.forEach(pt => p.vertex(pt.x, pt.y))
    p.endShape()

    // Draw guide dots
    p.noStroke()
    p.fill(guideColor)
    guidePath.forEach((pt, i) => {
      // Pulsing start point
      if (i === 0) {
        const pulse = Math.sin(p.frameCount * 0.1) * 5 + 15
        p.fill(52, 211, 153) // Green for start
        p.ellipse(pt.x, pt.y, pulse)
      } else {
        p.fill(guideColor)
        p.ellipse(pt.x, pt.y, 12)
      }
    })

    // Draw user's traced path
    if (userPath.length > 1) {
      p.stroke(strokeColor)
      p.strokeWeight(strokeWidth)
      p.noFill()
      p.beginShape()
      userPath.forEach(pt => p.vertex(pt.x, pt.y))
      p.endShape()
    }

    // Update and display sparkles
    for (let i = sparkles.length - 1; i >= 0; i--) {
      sparkles[i].update()
      sparkles[i].display()
      if (sparkles[i].isDead()) {
        sparkles.splice(i, 1)
      }
    }

    // Draw current finger position indicator when tracing
    if (isTracing && userPath.length > 0) {
      const lastPt = userPath[userPath.length - 1]
      p.noStroke()
      p.fill(59, 130, 246, 100)
      p.ellipse(lastPt.x, lastPt.y, strokeWidth + 10)
    }
  },

  touchStarted(p, props) {
    isTracing = true
    userPath = [{ x: p.mouseX, y: p.mouseY }]
  },

  touchMoved(p, props) {
    if (!isTracing) return

    const pt = { x: p.mouseX, y: p.mouseY }
    userPath.push(pt)

    // Add sparkle trail
    if (p.frameCount % 3 === 0) {
      sparkles.push(new TraceSparkle(p, pt.x, pt.y))
    }

    // Check progress along guide path
    const nearestIdx = findNearestGuidePoint(pt, guidePath)
    if (nearestIdx > traceProgress) {
      traceProgress = nearestIdx
    }
  },

  touchEnded(p, props) {
    isTracing = false

    // Check if tracing is complete (reached end of guide)
    const accuracy = calculateAccuracy(userPath, guidePath)

    if (traceProgress >= guidePath.length - 2 && accuracy > 0.5) {
      // Success!
      if (completionCallback) {
        completionCallback({
          accuracy: accuracy,
          success: true
        })
      }
    }
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

  // Reset for new letter
  reset(p, props) {
    this.setup(p, props)
  }
}

/**
 * Find nearest point on guide path
 */
function findNearestGuidePoint(pt, guide) {
  let minDist = Infinity
  let nearestIdx = 0

  guide.forEach((gpt, i) => {
    const dist = Math.sqrt((pt.x - gpt.x) ** 2 + (pt.y - gpt.y) ** 2)
    if (dist < minDist) {
      minDist = dist
      nearestIdx = i
    }
  })

  return nearestIdx
}

/**
 * Calculate tracing accuracy
 */
function calculateAccuracy(userPath, guidePath) {
  if (userPath.length < 2) return 0

  let totalDist = 0
  let closePoints = 0
  const threshold = 50 // Tolerance in pixels

  userPath.forEach(upt => {
    let minDist = Infinity
    guidePath.forEach(gpt => {
      const dist = Math.sqrt((upt.x - gpt.x) ** 2 + (upt.y - gpt.y) ** 2)
      if (dist < minDist) minDist = dist
    })

    totalDist += minDist
    if (minDist < threshold) closePoints++
  })

  return closePoints / userPath.length
}

export default tracingSketch
