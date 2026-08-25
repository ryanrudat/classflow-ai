/**
 * Village Ambient Effects Sketch for P5.js
 *
 * Creates a living village atmosphere with:
 * - Roaming villager/student characters
 * - Themed ambient particles (butterflies, leaves, etc.)
 * - Interactive touch sparkles
 * - Weather effects
 */

// Character and particle storage
let villagers = []
let particles = []
let touchSparkles = []
let weatherParticles = []

/**
 * Villager Character - walks around the village
 */
class Villager {
  constructor(p, x, y, options = {}) {
    this.p = p
    this.x = x
    this.y = y
    this.targetX = x
    this.targetY = y
    this.speed = options.speed || p.random(0.3, 0.8)
    this.size = options.size || p.random(20, 30)

    // Appearance
    this.skinColor = p.color(p.random([
      [255, 218, 185],  // Peach
      [210, 180, 140],  // Tan
      [139, 90, 43],    // Brown
      [255, 228, 196],  // Bisque
      [198, 134, 66]    // Medium
    ]))
    this.hairColor = p.color(p.random([
      [0, 0, 0],        // Black
      [139, 69, 19],    // Brown
      [255, 215, 0],    // Blonde
      [255, 127, 80],   // Red
      [101, 67, 33]     // Dark brown
    ]))
    this.shirtColor = p.color(p.random([
      [65, 105, 225],   // Royal blue
      [220, 20, 60],    // Crimson
      [50, 205, 50],    // Lime
      [255, 165, 0],    // Orange
      [147, 112, 219],  // Purple
      [255, 182, 193],  // Pink
      [64, 224, 208]    // Turquoise
    ]))

    // Animation state
    this.walkFrame = 0
    this.walkSpeed = p.random(0.1, 0.2)
    this.facing = 1 // 1 = right, -1 = left
    this.isWalking = false
    this.idleTime = 0
    this.maxIdleTime = p.random(60, 180) // Frames to wait before moving

    // Bobbing animation
    this.bobOffset = p.random(1000)
    this.bobAmount = 2

    // Boundary constraints (keep in grass areas)
    this.minX = p.width * 0.05
    this.maxX = p.width * 0.95
    this.minY = p.height * 0.6  // Keep in lower portion (foreground)
    this.maxY = p.height * 0.9
  }

  pickNewTarget() {
    const p = this.p
    this.targetX = p.random(this.minX, this.maxX)
    this.targetY = p.random(this.minY, this.maxY)
    this.isWalking = true
  }

  update() {
    const p = this.p
    const dx = this.targetX - this.x
    const dy = this.targetY - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > 5) {
      // Move towards target
      this.x += (dx / dist) * this.speed
      this.y += (dy / dist) * this.speed
      this.facing = dx > 0 ? 1 : -1
      this.isWalking = true
      this.walkFrame += this.walkSpeed
    } else {
      // Reached target, idle
      this.isWalking = false
      this.idleTime++

      if (this.idleTime > this.maxIdleTime) {
        this.idleTime = 0
        this.maxIdleTime = p.random(60, 180)
        this.pickNewTarget()
      }
    }

    // Update bob animation
    this.bobOffset += 0.05
  }

  display() {
    const p = this.p
    const bob = this.isWalking ? Math.sin(this.bobOffset) * this.bobAmount : 0
    const legSwing = this.isWalking ? Math.sin(this.walkFrame * 8) * 0.3 : 0

    p.push()
    p.translate(this.x, this.y + bob)
    p.scale(this.facing, 1)

    // Shadow
    p.noStroke()
    p.fill(0, 0, 0, 30)
    p.ellipse(0, this.size * 0.4, this.size * 0.8, this.size * 0.2)

    // Legs
    p.stroke(50)
    p.strokeWeight(this.size * 0.12)

    // Left leg
    p.push()
    p.rotate(legSwing)
    p.line(
      -this.size * 0.1, 0,
      -this.size * 0.1, this.size * 0.35
    )
    p.pop()

    // Right leg
    p.push()
    p.rotate(-legSwing)
    p.line(
      this.size * 0.1, 0,
      this.size * 0.1, this.size * 0.35
    )
    p.pop()

    // Body/shirt
    p.noStroke()
    p.fill(this.shirtColor)
    p.ellipse(0, -this.size * 0.1, this.size * 0.5, this.size * 0.4)

    // Arms with swing
    p.stroke(this.skinColor)
    p.strokeWeight(this.size * 0.1)
    const armSwing = this.isWalking ? Math.sin(this.walkFrame * 8) * 0.4 : 0

    p.push()
    p.rotate(-armSwing)
    p.line(-this.size * 0.25, -this.size * 0.1, -this.size * 0.35, this.size * 0.1)
    p.pop()

    p.push()
    p.rotate(armSwing)
    p.line(this.size * 0.25, -this.size * 0.1, this.size * 0.35, this.size * 0.1)
    p.pop()

    // Head
    p.noStroke()
    p.fill(this.skinColor)
    p.ellipse(0, -this.size * 0.35, this.size * 0.35, this.size * 0.35)

    // Hair
    p.fill(this.hairColor)
    p.arc(0, -this.size * 0.4, this.size * 0.35, this.size * 0.25, p.PI, p.TWO_PI)

    // Eyes
    p.fill(0)
    p.ellipse(-this.size * 0.06, -this.size * 0.35, this.size * 0.06, this.size * 0.06)
    p.ellipse(this.size * 0.06, -this.size * 0.35, this.size * 0.06, this.size * 0.06)

    // Smile
    p.noFill()
    p.stroke(0)
    p.strokeWeight(1)
    p.arc(0, -this.size * 0.3, this.size * 0.12, this.size * 0.08, 0, p.PI)

    p.pop()
  }
}

/**
 * Themed ambient particle base class
 */
class AmbientParticle {
  constructor(p, x, y, options = {}) {
    this.p = p
    this.x = x
    this.y = y
    this.size = options.size || p.random(8, 16)
    this.vx = options.vx || p.random(-0.5, 0.5)
    this.vy = options.vy || p.random(-0.5, 0.5)
    this.alpha = options.alpha || 200
    this.rotation = p.random(p.TWO_PI)
    this.rotationSpeed = p.random(-0.02, 0.02)
  }

  update() {
    this.x += this.vx
    this.y += this.vy
    this.rotation += this.rotationSpeed

    // Wrap around screen
    const p = this.p
    if (this.x < -20) this.x = p.width + 20
    if (this.x > p.width + 20) this.x = -20
    if (this.y < -20) this.y = p.height + 20
    if (this.y > p.height + 20) this.y = -20
  }

  display() {}
}

/**
 * Butterfly particle
 */
class Butterfly extends AmbientParticle {
  constructor(p, x, y) {
    super(p, x, y, {
      size: p.random(12, 20),
      vx: p.random(-1, 1),
      vy: p.random(-0.5, 0.5)
    })
    this.wingAngle = 0
    this.wingSpeed = p.random(0.15, 0.25)
    this.color = p.color(p.random([
      [255, 182, 193],
      [255, 215, 0],
      [135, 206, 250],
      [152, 251, 152],
      [255, 160, 122]
    ]))
    this.wobble = p.random(1000)
  }

  update() {
    this.wingAngle += this.wingSpeed
    this.wobble += 0.02

    // Gentle wobbling flight
    this.x += this.vx + Math.sin(this.wobble) * 0.5
    this.y += this.vy + Math.cos(this.wobble * 1.3) * 0.3

    // Wrap
    const p = this.p
    if (this.x < -20) this.x = p.width + 20
    if (this.x > p.width + 20) this.x = -20
    if (this.y < -20) this.y = p.height * 0.3
    if (this.y > p.height * 0.6) this.y = -20
  }

  display() {
    const p = this.p
    const wingFlap = Math.sin(this.wingAngle) * 0.5 + 0.5

    p.push()
    p.translate(this.x, this.y)
    p.rotate(Math.atan2(this.vy, this.vx))

    p.noStroke()
    p.fill(p.red(this.color), p.green(this.color), p.blue(this.color), 200)

    // Wings
    p.push()
    p.scale(1, wingFlap * 0.8 + 0.2)
    p.ellipse(-this.size * 0.3, -this.size * 0.2, this.size * 0.8, this.size * 0.5)
    p.ellipse(-this.size * 0.3, this.size * 0.2, this.size * 0.8, this.size * 0.5)
    p.pop()

    // Body
    p.fill(60)
    p.ellipse(0, 0, this.size * 0.25, this.size * 0.08)

    p.pop()
  }
}

/**
 * Leaf particle
 */
class Leaf extends AmbientParticle {
  constructor(p, x, y) {
    super(p, x, y, {
      size: p.random(10, 18),
      vy: p.random(0.3, 1),
      vx: p.random(-0.3, 0.3)
    })
    this.color = p.color(p.random([
      [34, 197, 94],
      [74, 222, 128],
      [234, 179, 8],
      [249, 115, 22]
    ]))
    this.wobble = p.random(1000)
  }

  update() {
    this.wobble += 0.03
    this.x += this.vx + Math.sin(this.wobble) * 0.8
    this.y += this.vy
    this.rotation += this.rotationSpeed

    const p = this.p
    if (this.y > p.height + 20) {
      this.y = -20
      this.x = p.random(p.width)
    }
  }

  display() {
    const p = this.p

    p.push()
    p.translate(this.x, this.y)
    p.rotate(this.rotation)

    p.noStroke()
    p.fill(this.color)

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
    p.stroke(p.red(this.color) * 0.7, p.green(this.color) * 0.7, p.blue(this.color) * 0.7)
    p.strokeWeight(1)
    p.line(0, 0, 0, this.size * 0.4)

    p.pop()
  }
}

/**
 * Sparkle particle
 */
class Sparkle extends AmbientParticle {
  constructor(p, x, y) {
    super(p, x, y, {
      size: p.random(4, 10),
      vy: p.random(-1, -0.3)
    })
    this.twinkle = p.random(1000)
    this.color = p.color(255, 215, 0) // Gold
  }

  update() {
    super.update()
    this.twinkle += 0.1
    this.alpha = 150 + Math.sin(this.twinkle) * 100
  }

  display() {
    const p = this.p
    const currentAlpha = Math.max(0, this.alpha)

    p.push()
    p.translate(this.x, this.y)
    p.rotate(this.rotation)

    p.noStroke()
    p.fill(255, 215, 0, currentAlpha)

    // Star shape
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
}

/**
 * Touch sparkle effect
 */
class TouchSparkle {
  constructor(p, x, y) {
    this.p = p
    this.x = x
    this.y = y
    this.size = p.random(10, 18)
    this.alpha = 255
    this.vx = p.random(-4, 4)
    this.vy = p.random(-4, 4)
    this.color = p.color(p.random([
      [255, 215, 0],    // Gold
      [255, 182, 193],  // Pink
      [135, 206, 250],  // Light blue
      [152, 251, 152]   // Pale green
    ]))
  }

  update() {
    this.x += this.vx
    this.y += this.vy
    this.vx *= 0.92
    this.vy *= 0.92
    this.alpha -= 10
    this.size *= 0.95
  }

  display() {
    const p = this.p
    p.push()
    p.translate(this.x, this.y)

    p.noStroke()
    p.fill(p.red(this.color), p.green(this.color), p.blue(this.color), this.alpha)

    // Star
    p.beginShape()
    for (let i = 0; i < 5; i++) {
      const angle = (p.TWO_PI / 5) * i - p.HALF_PI
      p.vertex(Math.cos(angle) * this.size, Math.sin(angle) * this.size)
      const innerAngle = angle + p.TWO_PI / 10
      p.vertex(Math.cos(innerAngle) * this.size * 0.4, Math.sin(innerAngle) * this.size * 0.4)
    }
    p.endShape(p.CLOSE)

    p.pop()
  }

  isDead() {
    return this.alpha <= 0
  }
}

/**
 * Get particle class for land type
 */
function getParticleClass(landType) {
  const typeMap = {
    animals: Butterfly,
    nature: Leaf,
    forest: Leaf,
    garden: Butterfly,
    colors: Sparkle,
    ocean: Sparkle,
    default: Butterfly
  }

  for (const [key, ParticleClass] of Object.entries(typeMap)) {
    if (landType?.toLowerCase().includes(key)) {
      return ParticleClass
    }
  }

  return typeMap.default
}

/**
 * Village Ambient Sketch
 */
export const villageAmbientSketch = {
  setup(p, props) {
    const { characterCount = 3, landType = 'default' } = props

    // Initialize arrays
    villagers = []
    particles = []
    touchSparkles = []

    // Create villagers
    for (let i = 0; i < characterCount; i++) {
      villagers.push(new Villager(
        p,
        p.random(p.width * 0.1, p.width * 0.9),
        p.random(p.height * 0.65, p.height * 0.85),
        { size: p.random(18, 28) }
      ))
    }

    // Create ambient particles
    const ParticleClass = getParticleClass(landType)
    for (let i = 0; i < 8; i++) {
      particles.push(new ParticleClass(
        p,
        p.random(p.width),
        p.random(p.height * 0.5)
      ))
    }
  },

  draw(p, props) {
    // Update and display ambient particles
    particles.forEach(particle => {
      particle.update()
      particle.display()
    })

    // Update and display villagers
    villagers.forEach(villager => {
      villager.update()
      villager.display()
    })

    // Update and display touch sparkles
    for (let i = touchSparkles.length - 1; i >= 0; i--) {
      touchSparkles[i].update()
      touchSparkles[i].display()
      if (touchSparkles[i].isDead()) {
        touchSparkles.splice(i, 1)
      }
    }
  },

  touchStarted(p, props) {
    // Create burst of sparkles on touch
    for (let i = 0; i < 10; i++) {
      touchSparkles.push(new TouchSparkle(p, p.mouseX, p.mouseY))
    }
  },

  mousePressed(p, props) {
    this.touchStarted(p, props)
  },

  windowResized(p, props) {
    // Update villager boundaries on resize
    villagers.forEach(v => {
      v.minX = p.width * 0.05
      v.maxX = p.width * 0.95
      v.minY = p.height * 0.6
      v.maxY = p.height * 0.9

      // Keep villager in bounds
      v.x = Math.max(v.minX, Math.min(v.maxX, v.x))
      v.y = Math.max(v.minY, Math.min(v.maxY, v.y))
    })
  }
}

export default villageAmbientSketch
