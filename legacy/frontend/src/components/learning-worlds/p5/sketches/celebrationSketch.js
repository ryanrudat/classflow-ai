/**
 * Celebration Sketch for P5.js
 * Creates a beautiful celebration effect with confetti, stars, and sparkles
 * Used when students complete activities successfully
 */

import {
  ConfettiParticle,
  StarParticle,
  SparkleParticle,
  createConfettiBurst,
  createStarBurst,
  createSparkles
} from '../utils/particleSystem.js'

// Particle storage
let confetti = []
let stars = []
let sparkles = []
let initialized = false

/**
 * Celebration Sketch Object
 * Use with P5Canvas component
 */
export const celebrationSketch = {
  setup(p, props) {
    const { starsEarned = 3, ageLevel = 2 } = props

    // Clear any existing particles
    confetti = []
    stars = []
    sparkles = []

    // Create initial burst from center
    const centerX = p.width / 2
    const centerY = p.height / 2

    // Confetti burst - more for younger kids (more rewarding)
    const confettiCount = ageLevel === 1 ? 80 : ageLevel === 2 ? 60 : 40
    confetti = createConfettiBurst(p, centerX, centerY, confettiCount)

    // Stars based on earned stars
    for (let i = 0; i < starsEarned; i++) {
      const delay = i * 300
      setTimeout(() => {
        const starX = p.width * (0.3 + i * 0.2)
        const starY = p.height * 0.4
        stars.push(...createStarBurst(p, starX, starY, 1, {
          size: 60,
          decay: 0.003
        }))
        // Add sparkles around each star
        sparkles.push(...createSparkles(p, starX, starY, 15, 80))
      }, delay)
    }

    // Periodic sparkles
    setInterval(() => {
      if (sparkles.length < 50) {
        const x = p.random(p.width)
        const y = p.random(p.height * 0.7)
        sparkles.push(new SparkleParticle(p, x, y, {
          size: p.random(4, 10),
          decay: 0.03
        }))
      }
    }, 100)

    initialized = true
  },

  draw(p, props) {
    if (!initialized) return

    // Update and display confetti
    for (let i = confetti.length - 1; i >= 0; i--) {
      confetti[i].update()
      confetti[i].display()
      if (confetti[i].isDead()) {
        confetti.splice(i, 1)
      }
    }

    // Update and display stars
    for (let i = stars.length - 1; i >= 0; i--) {
      stars[i].update()
      stars[i].display()
      if (stars[i].isDead()) {
        stars.splice(i, 1)
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

  // Touch creates additional sparkles
  touchStarted(p, props) {
    sparkles.push(...createSparkles(p, p.mouseX, p.mouseY, 10, 40))
  },

  mousePressed(p, props) {
    sparkles.push(...createSparkles(p, p.mouseX, p.mouseY, 10, 40))
  }
}

/**
 * Quick celebration burst - for correct answers during activity
 */
export const quickCelebrationSketch = {
  setup(p, props) {
    const { x = p.width / 2, y = p.height / 2, intensity = 'medium' } = props

    confetti = []
    stars = []
    sparkles = []

    const counts = {
      light: { confetti: 15, sparkles: 8 },
      medium: { confetti: 30, sparkles: 15 },
      heavy: { confetti: 50, sparkles: 25 }
    }

    const count = counts[intensity] || counts.medium

    confetti = createConfettiBurst(p, x, y, count.confetti)
    sparkles = createSparkles(p, x, y, count.sparkles, 60)

    initialized = true
  },

  draw(p, props) {
    if (!initialized) return

    for (let i = confetti.length - 1; i >= 0; i--) {
      confetti[i].update()
      confetti[i].display()
      if (confetti[i].isDead()) {
        confetti.splice(i, 1)
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
 * Success feedback effect - green sparkle burst
 */
export const successFeedbackSketch = {
  setup(p, props) {
    const { x = p.width / 2, y = p.height / 2 } = props

    sparkles = createSparkles(p, x, y, 20, 50, {
      color: p.color(34, 197, 94), // Green
      decay: 0.04
    })

    initialized = true
  },

  draw(p, props) {
    if (!initialized) return

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
 * Error feedback effect - gentle red pulse
 */
export const errorFeedbackSketch = {
  setup(p, props) {
    const { x = p.width / 2, y = p.height / 2 } = props

    // Just a few red sparkles, less intense
    sparkles = createSparkles(p, x, y, 8, 30, {
      color: p.color(239, 68, 68), // Red
      decay: 0.06
    })

    initialized = true
  },

  draw(p, props) {
    if (!initialized) return

    for (let i = sparkles.length - 1; i >= 0; i--) {
      sparkles[i].update()
      sparkles[i].display()
      if (sparkles[i].isDead()) {
        sparkles.splice(i, 1)
      }
    }
  }
}

export default celebrationSketch
