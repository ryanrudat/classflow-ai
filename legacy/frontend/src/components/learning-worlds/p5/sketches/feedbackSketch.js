/**
 * Feedback Sketches for P5.js
 * Provides visual feedback effects for activity interactions
 */

import { RippleEffect, SparkleParticle, createSparkles } from '../utils/particleSystem.js'

// Effect storage
let effects = []
let sparkles = []

/**
 * Touch Ripple Feedback - shows ripple where user touches
 */
export const touchRippleSketch = {
  setup(p, props) {
    effects = []
    sparkles = []
  },

  draw(p, props) {
    // Update and display ripples
    for (let i = effects.length - 1; i >= 0; i--) {
      effects[i].update()
      effects[i].display()
      if (effects[i].isDead()) {
        effects.splice(i, 1)
      }
    }

    // Update and display sparkles
    for (let i = sparkles.length - 1; i >= 0; i--) {
      sparkles[i].update()
      sparkles[i].display()
      if (sparkles[i].isDead()) {
        sparkles.splice(i, 1)
      }
    }
  },

  // Add a ripple effect at touch point
  addRipple(p, x, y, color) {
    effects.push(new RippleEffect(p, x, y, {
      color: color || p.color(100, 180, 255),
      maxRadius: 60,
      speed: 3
    }))
  },

  // Add success effect (green sparkles)
  addSuccess(p, x, y) {
    sparkles.push(...createSparkles(p, x, y, 15, 50, {
      color: p.color(34, 197, 94),
      decay: 0.04
    }))
  },

  // Add error effect (red gentle pulse)
  addError(p, x, y) {
    sparkles.push(...createSparkles(p, x, y, 6, 30, {
      color: p.color(239, 68, 68),
      decay: 0.06
    }))
  },

  touchStarted(p, props) {
    this.addRipple(p, p.mouseX, p.mouseY)
  },

  mousePressed(p, props) {
    this.addRipple(p, p.mouseX, p.mouseY)
  }
}

/**
 * Success Burst Sketch - for correct answers
 */
export const successBurstSketch = {
  setup(p, props) {
    const { x = p.width / 2, y = p.height / 2 } = props
    sparkles = createSparkles(p, x, y, 25, 60, {
      color: p.color(34, 197, 94), // Green
      decay: 0.03,
      size: p.random(6, 12)
    })

    // Add a central glow
    effects = [new RippleEffect(p, x, y, {
      color: p.color(34, 197, 94, 150),
      maxRadius: 80,
      speed: 4,
      strokeWeight: 4
    })]
  },

  draw(p, props) {
    for (let i = effects.length - 1; i >= 0; i--) {
      effects[i].update()
      effects[i].display()
      if (effects[i].isDead()) {
        effects.splice(i, 1)
      }
    }

    for (let i = sparkles.length - 1; i >= 0; i--) {
      sparkles[i].update()
      sparkles[i].display()
      if (sparkles[i].isDead()) {
        sparkles.splice(i, 1)
      }
    }
  }
}

/**
 * Error Shake Sketch - for incorrect answers
 */
export const errorShakeSketch = {
  setup(p, props) {
    const { x = p.width / 2, y = p.height / 2 } = props
    sparkles = createSparkles(p, x, y, 8, 40, {
      color: p.color(239, 68, 68), // Red
      decay: 0.05
    })

    effects = [new RippleEffect(p, x, y, {
      color: p.color(239, 68, 68, 100),
      maxRadius: 50,
      speed: 5
    })]
  },

  draw(p, props) {
    for (let i = effects.length - 1; i >= 0; i--) {
      effects[i].update()
      effects[i].display()
      if (effects[i].isDead()) {
        effects.splice(i, 1)
      }
    }

    for (let i = sparkles.length - 1; i >= 0; i--) {
      sparkles[i].update()
      sparkles[i].display()
      if (sparkles[i].isDead()) {
        sparkles.splice(i, 1)
      }
    }
  }
}

/**
 * Sparkle Trail Sketch - follows touch/mouse movement
 */
export const sparkleTrailSketch = {
  setup(p, props) {
    sparkles = []
  },

  draw(p, props) {
    const { color = p.color(255, 215, 0), active = true } = props

    // Add sparkles while moving
    if (active && p.mouseIsPressed) {
      if (p.frameCount % 3 === 0) {
        sparkles.push(new SparkleParticle(p, p.mouseX + p.random(-10, 10), p.mouseY + p.random(-10, 10), {
          color: color,
          size: p.random(4, 8),
          decay: 0.04
        }))
      }
    }

    // Update and display
    for (let i = sparkles.length - 1; i >= 0; i--) {
      sparkles[i].update()
      sparkles[i].display()
      if (sparkles[i].isDead()) {
        sparkles.splice(i, 1)
      }
    }
  },

  touchMoved(p, props) {
    const { color = p.color(255, 215, 0) } = props
    sparkles.push(new SparkleParticle(p, p.mouseX + p.random(-10, 10), p.mouseY + p.random(-10, 10), {
      color: color,
      size: p.random(4, 8),
      decay: 0.04
    }))
  }
}

/**
 * Match Line Sketch - draws animated line between matched items
 */
export const matchLineSketch = {
  setup(p, props) {
    effects = []
  },

  draw(p, props) {
    const { lines = [], lineColor = p.color(34, 197, 94) } = props

    // Draw each match line with animation
    lines.forEach(line => {
      const { x1, y1, x2, y2, progress = 1 } = line

      // Animated line drawing
      const currentX = p.lerp(x1, x2, progress)
      const currentY = p.lerp(y1, y2, progress)

      p.stroke(lineColor)
      p.strokeWeight(3)
      p.line(x1, y1, currentX, currentY)

      // Glow effect
      p.stroke(p.red(lineColor), p.green(lineColor), p.blue(lineColor), 100)
      p.strokeWeight(8)
      p.line(x1, y1, currentX, currentY)
    })
  }
}

export default {
  touchRippleSketch,
  successBurstSketch,
  errorShakeSketch,
  sparkleTrailSketch,
  matchLineSketch
}
