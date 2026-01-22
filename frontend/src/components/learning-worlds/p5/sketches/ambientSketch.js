/**
 * Ambient Effects Sketch for P5.js
 * Creates subtle, theme-appropriate background animations for LandView
 */

// Particle storage
let particles = []
let touchParticles = []

/**
 * Base Particle class for ambient effects
 */
class AmbientParticle {
  constructor(p, x, y, options = {}) {
    this.p = p
    this.x = x
    this.y = y
    this.size = options.size || p.random(4, 12)
    this.alpha = options.alpha || 200
    this.color = options.color || p.color(255, 255, 255)
    this.vx = options.vx || p.random(-0.5, 0.5)
    this.vy = options.vy || p.random(-0.5, 0.5)
    this.wobble = p.random(1000)
    this.wobbleSpeed = p.random(0.01, 0.03)
    this.wobbleAmount = p.random(1, 3)
  }

  update() {
    this.x += this.vx + Math.sin(this.wobble) * this.wobbleAmount * 0.1
    this.y += this.vy
    this.wobble += this.wobbleSpeed

    // Wrap around screen
    const p = this.p
    if (this.x < -20) this.x = p.width + 20
    if (this.x > p.width + 20) this.x = -20
    if (this.y < -20) this.y = p.height + 20
    if (this.y > p.height + 20) this.y = -20
  }

  display() {
    // Override in subclass
  }
}

/**
 * Butterfly particle
 */
class Butterfly extends AmbientParticle {
  constructor(p, x, y) {
    super(p, x, y, {
      size: p.random(15, 25),
      vx: p.random(-1, 1),
      vy: p.random(-0.5, 0.5)
    })
    this.wingAngle = 0
    this.wingSpeed = p.random(0.15, 0.25)
    this.bodyColor = p.color(
      p.random([
        [255, 182, 193], // Pink
        [255, 215, 0],   // Gold
        [135, 206, 250], // Light blue
        [255, 160, 122], // Light salmon
        [152, 251, 152]  // Pale green
      ])
    )
  }

  update() {
    super.update()
    this.wingAngle += this.wingSpeed
  }

  display() {
    const p = this.p
    const wingFlap = Math.sin(this.wingAngle) * 0.5 + 0.5

    p.push()
    p.translate(this.x, this.y)
    p.rotate(Math.atan2(this.vy, this.vx))

    // Wings
    p.noStroke()
    p.fill(p.red(this.bodyColor), p.green(this.bodyColor), p.blue(this.bodyColor), 200)

    // Left wing
    p.push()
    p.scale(1, wingFlap * 0.8 + 0.2)
    p.ellipse(-this.size * 0.3, -this.size * 0.2, this.size * 0.8, this.size * 0.5)
    p.pop()

    // Right wing
    p.push()
    p.scale(1, wingFlap * 0.8 + 0.2)
    p.ellipse(-this.size * 0.3, this.size * 0.2, this.size * 0.8, this.size * 0.5)
    p.pop()

    // Body
    p.fill(80)
    p.ellipse(0, 0, this.size * 0.3, this.size * 0.1)

    p.pop()
  }
}

/**
 * Floating bubble particle
 */
class Bubble extends AmbientParticle {
  constructor(p, x, y) {
    super(p, x, y, {
      size: p.random(8, 20),
      vy: p.random(-1.5, -0.5),
      alpha: p.random(100, 180)
    })
  }

  display() {
    const p = this.p
    p.push()

    // Bubble body
    p.noFill()
    p.stroke(255, 255, 255, this.alpha)
    p.strokeWeight(1.5)
    p.ellipse(this.x, this.y, this.size)

    // Highlight
    p.fill(255, 255, 255, this.alpha * 0.5)
    p.noStroke()
    p.ellipse(this.x - this.size * 0.2, this.y - this.size * 0.2, this.size * 0.3)

    p.pop()
  }
}

/**
 * Fish particle for ocean themes
 */
class Fish extends AmbientParticle {
  constructor(p, x, y) {
    super(p, x, y, {
      size: p.random(12, 24),
      vx: p.random([-1.5, 1.5]) * (p.random() > 0.5 ? 1 : -1),
      vy: p.random(-0.3, 0.3)
    })
    this.bodyColor = p.color(
      p.random([
        [255, 127, 80],  // Coral
        [255, 215, 0],   // Gold
        [64, 224, 208],  // Turquoise
        [255, 99, 71],   // Tomato
        [100, 149, 237]  // Cornflower blue
      ])
    )
    this.tailWag = 0
  }

  update() {
    super.update()
    this.tailWag += 0.2
  }

  display() {
    const p = this.p
    const direction = this.vx > 0 ? 1 : -1

    p.push()
    p.translate(this.x, this.y)
    p.scale(direction, 1)

    // Body
    p.noStroke()
    p.fill(this.bodyColor)
    p.ellipse(0, 0, this.size, this.size * 0.6)

    // Tail
    const tailAngle = Math.sin(this.tailWag) * 0.3
    p.push()
    p.translate(-this.size * 0.4, 0)
    p.rotate(tailAngle)
    p.triangle(
      0, 0,
      -this.size * 0.4, -this.size * 0.3,
      -this.size * 0.4, this.size * 0.3
    )
    p.pop()

    // Eye
    p.fill(255)
    p.ellipse(this.size * 0.2, -this.size * 0.1, this.size * 0.2)
    p.fill(0)
    p.ellipse(this.size * 0.22, -this.size * 0.1, this.size * 0.1)

    p.pop()
  }
}

/**
 * Leaf particle for nature themes
 */
class Leaf extends AmbientParticle {
  constructor(p, x, y) {
    super(p, x, y, {
      size: p.random(10, 18),
      vy: p.random(0.5, 1.5),
      vx: p.random(-0.5, 0.5)
    })
    this.rotation = p.random(p.TWO_PI)
    this.rotationSpeed = p.random(-0.02, 0.02)
    this.leafColor = p.color(
      p.random([
        [34, 197, 94],   // Green
        [74, 222, 128],  // Light green
        [22, 163, 74],   // Dark green
        [234, 179, 8],   // Yellow (autumn)
        [249, 115, 22]   // Orange (autumn)
      ])
    )
  }

  update() {
    super.update()
    this.rotation += this.rotationSpeed
  }

  display() {
    const p = this.p

    p.push()
    p.translate(this.x, this.y)
    p.rotate(this.rotation)

    p.noStroke()
    p.fill(this.leafColor)

    // Leaf shape
    p.beginShape()
    p.vertex(0, -this.size * 0.5)
    p.bezierVertex(
      this.size * 0.3, -this.size * 0.3,
      this.size * 0.3, this.size * 0.3,
      0, this.size * 0.5
    )
    p.bezierVertex(
      -this.size * 0.3, this.size * 0.3,
      -this.size * 0.3, -this.size * 0.3,
      0, -this.size * 0.5
    )
    p.endShape()

    // Stem
    p.stroke(p.red(this.leafColor) * 0.7, p.green(this.leafColor) * 0.7, p.blue(this.leafColor) * 0.7)
    p.strokeWeight(1)
    p.line(0, 0, 0, this.size * 0.5)

    p.pop()
  }
}

/**
 * Sparkle for touch feedback
 */
class TouchSparkle {
  constructor(p, x, y) {
    this.p = p
    this.x = x
    this.y = y
    this.size = p.random(8, 16)
    this.alpha = 255
    this.vx = p.random(-3, 3)
    this.vy = p.random(-3, 3)
    this.color = p.color(255, 215, 0) // Gold
  }

  update() {
    this.x += this.vx
    this.y += this.vy
    this.vx *= 0.95
    this.vy *= 0.95
    this.alpha -= 8
    this.size *= 0.96
  }

  display() {
    const p = this.p
    p.push()
    p.noStroke()
    p.fill(p.red(this.color), p.green(this.color), p.blue(this.color), this.alpha)

    // Star shape
    p.translate(this.x, this.y)
    p.beginShape()
    for (let i = 0; i < 5; i++) {
      const angle = (p.TWO_PI / 5) * i - p.HALF_PI
      const outerX = Math.cos(angle) * this.size
      const outerY = Math.sin(angle) * this.size
      p.vertex(outerX, outerY)

      const innerAngle = angle + p.TWO_PI / 10
      const innerX = Math.cos(innerAngle) * this.size * 0.4
      const innerY = Math.sin(innerAngle) * this.size * 0.4
      p.vertex(innerX, innerY)
    }
    p.endShape(p.CLOSE)

    p.pop()
  }

  isDead() {
    return this.alpha <= 0
  }
}

/**
 * Get particle class for theme
 */
function getParticleClass(theme) {
  const themeParticles = {
    ocean: Fish,
    underwater: Fish,
    safari: Butterfly,
    nature: Leaf,
    forest: Leaf,
    garden: Butterfly,
    sky: Bubble,
    space: Bubble,
    default: Butterfly
  }

  // Match theme to particle type
  for (const [key, ParticleClass] of Object.entries(themeParticles)) {
    if (theme?.toLowerCase().includes(key)) {
      return ParticleClass
    }
  }

  return themeParticles.default
}

/**
 * Ambient Effects Sketch
 */
export const ambientSketch = {
  setup(p, props) {
    const { theme = 'default', particleCount = 12 } = props

    particles = []
    touchParticles = []

    const ParticleClass = getParticleClass(theme)

    // Create initial particles
    for (let i = 0; i < particleCount; i++) {
      particles.push(new ParticleClass(
        p,
        p.random(p.width),
        p.random(p.height)
      ))
    }
  },

  draw(p, props) {
    // Update and display ambient particles
    particles.forEach(particle => {
      particle.update()
      particle.display()
    })

    // Update and display touch particles
    for (let i = touchParticles.length - 1; i >= 0; i--) {
      touchParticles[i].update()
      touchParticles[i].display()
      if (touchParticles[i].isDead()) {
        touchParticles.splice(i, 1)
      }
    }
  },

  touchStarted(p, props) {
    // Add sparkles on touch
    for (let i = 0; i < 8; i++) {
      touchParticles.push(new TouchSparkle(p, p.mouseX, p.mouseY))
    }
  },

  mousePressed(p, props) {
    this.touchStarted(p, props)
  }
}

/**
 * Floating clouds ambient effect
 */
export const cloudAmbientSketch = {
  clouds: [],

  setup(p, props) {
    const { cloudCount = 5 } = props
    this.clouds = []

    for (let i = 0; i < cloudCount; i++) {
      this.clouds.push({
        x: p.random(p.width),
        y: p.random(p.height * 0.3),
        size: p.random(60, 120),
        speed: p.random(0.2, 0.5),
        alpha: p.random(80, 150)
      })
    }
  },

  draw(p, props) {
    this.clouds.forEach(cloud => {
      // Move cloud
      cloud.x += cloud.speed
      if (cloud.x > p.width + cloud.size) {
        cloud.x = -cloud.size
      }

      // Draw cloud
      p.noStroke()
      p.fill(255, 255, 255, cloud.alpha)

      // Cloud body (overlapping circles)
      p.ellipse(cloud.x, cloud.y, cloud.size * 0.8, cloud.size * 0.4)
      p.ellipse(cloud.x - cloud.size * 0.25, cloud.y + cloud.size * 0.05, cloud.size * 0.5, cloud.size * 0.3)
      p.ellipse(cloud.x + cloud.size * 0.25, cloud.y + cloud.size * 0.05, cloud.size * 0.5, cloud.size * 0.3)
      p.ellipse(cloud.x - cloud.size * 0.15, cloud.y - cloud.size * 0.1, cloud.size * 0.4, cloud.size * 0.25)
      p.ellipse(cloud.x + cloud.size * 0.15, cloud.y - cloud.size * 0.1, cloud.size * 0.4, cloud.size * 0.25)
    })
  }
}

export default ambientSketch
