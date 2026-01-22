/**
 * Particle System Utilities for P5.js
 * Provides confetti, stars, sparkles, and other celebration effects
 */

/**
 * Confetti Particle Class
 */
export class ConfettiParticle {
  constructor(p, x, y, options = {}) {
    this.p = p
    this.x = x
    this.y = y
    this.vx = options.vx ?? (p.random(-8, 8))
    this.vy = options.vy ?? (p.random(-15, -5))
    this.gravity = options.gravity ?? 0.3
    this.friction = options.friction ?? 0.99
    this.rotation = p.random(p.TWO_PI)
    this.rotationSpeed = p.random(-0.2, 0.2)
    this.size = options.size ?? p.random(8, 15)
    this.color = options.color ?? p.color(
      p.random(200, 255),
      p.random(100, 255),
      p.random(100, 255)
    )
    this.shape = options.shape ?? p.floor(p.random(3)) // 0=rect, 1=circle, 2=triangle
    this.life = 1.0
    this.decay = options.decay ?? p.random(0.005, 0.015)
  }

  update() {
    this.vy += this.gravity
    this.vx *= this.friction
    this.x += this.vx
    this.y += this.vy
    this.rotation += this.rotationSpeed
    this.life -= this.decay
  }

  display() {
    const p = this.p
    if (this.life <= 0) return

    p.push()
    p.translate(this.x, this.y)
    p.rotate(this.rotation)
    p.noStroke()
    p.fill(p.red(this.color), p.green(this.color), p.blue(this.color), this.life * 255)

    if (this.shape === 0) {
      p.rect(-this.size / 2, -this.size / 4, this.size, this.size / 2)
    } else if (this.shape === 1) {
      p.ellipse(0, 0, this.size, this.size)
    } else {
      p.triangle(0, -this.size / 2, -this.size / 2, this.size / 2, this.size / 2, this.size / 2)
    }
    p.pop()
  }

  isDead() {
    return this.life <= 0 || this.y > this.p.height + 50
  }
}

/**
 * Star Particle Class
 */
export class StarParticle {
  constructor(p, x, y, options = {}) {
    this.p = p
    this.x = x
    this.y = y
    this.targetX = options.targetX ?? x
    this.targetY = options.targetY ?? y
    this.vx = options.vx ?? p.random(-3, 3)
    this.vy = options.vy ?? p.random(-8, -3)
    this.rotation = 0
    this.rotationSpeed = options.rotationSpeed ?? p.random(0.05, 0.15)
    this.size = options.size ?? p.random(20, 40)
    this.color = options.color ?? p.color(255, 215, 0) // Gold
    this.life = 1.0
    this.decay = options.decay ?? 0.008
    this.scale = 0
    this.targetScale = 1
  }

  update() {
    // Grow in
    this.scale = this.p.lerp(this.scale, this.targetScale, 0.1)

    // Float upward with drift
    this.x += this.vx
    this.y += this.vy
    this.vy *= 0.98
    this.vx *= 0.98

    this.rotation += this.rotationSpeed
    this.life -= this.decay
  }

  display() {
    const p = this.p
    if (this.life <= 0) return

    p.push()
    p.translate(this.x, this.y)
    p.rotate(this.rotation)
    p.scale(this.scale)

    // Draw star shape
    p.fill(p.red(this.color), p.green(this.color), p.blue(this.color), this.life * 255)
    p.noStroke()
    this.drawStar(p, 0, 0, this.size / 2, this.size / 4, 5)
    p.pop()
  }

  drawStar(p, x, y, radius1, radius2, npoints) {
    const angle = p.TWO_PI / npoints
    const halfAngle = angle / 2.0
    p.beginShape()
    for (let a = -p.PI / 2; a < p.TWO_PI - p.PI / 2; a += angle) {
      let sx = x + p.cos(a) * radius1
      let sy = y + p.sin(a) * radius1
      p.vertex(sx, sy)
      sx = x + p.cos(a + halfAngle) * radius2
      sy = y + p.sin(a + halfAngle) * radius2
      p.vertex(sx, sy)
    }
    p.endShape(p.CLOSE)
  }

  isDead() {
    return this.life <= 0
  }
}

/**
 * Sparkle Particle Class
 */
export class SparkleParticle {
  constructor(p, x, y, options = {}) {
    this.p = p
    this.x = x
    this.y = y
    this.size = options.size ?? p.random(3, 8)
    this.maxSize = this.size
    this.color = options.color ?? p.color(255, 255, 255)
    this.life = 1.0
    this.decay = options.decay ?? p.random(0.02, 0.05)
    this.twinkleSpeed = p.random(0.1, 0.3)
    this.twinklePhase = p.random(p.TWO_PI)
  }

  update() {
    this.twinklePhase += this.twinkleSpeed
    this.size = this.maxSize * (0.5 + 0.5 * this.p.sin(this.twinklePhase))
    this.life -= this.decay
  }

  display() {
    const p = this.p
    if (this.life <= 0) return

    p.push()
    p.translate(this.x, this.y)
    p.noStroke()

    // Outer glow
    p.fill(p.red(this.color), p.green(this.color), p.blue(this.color), this.life * 100)
    p.ellipse(0, 0, this.size * 2, this.size * 2)

    // Inner bright
    p.fill(255, 255, 255, this.life * 255)
    p.ellipse(0, 0, this.size, this.size)
    p.pop()
  }

  isDead() {
    return this.life <= 0
  }
}

/**
 * Ripple Effect Class
 */
export class RippleEffect {
  constructor(p, x, y, options = {}) {
    this.p = p
    this.x = x
    this.y = y
    this.radius = 0
    this.maxRadius = options.maxRadius ?? 80
    this.speed = options.speed ?? 4
    this.color = options.color ?? p.color(100, 200, 255)
    this.strokeWeight = options.strokeWeight ?? 3
    this.life = 1.0
  }

  update() {
    this.radius += this.speed
    this.life = 1 - (this.radius / this.maxRadius)
  }

  display() {
    const p = this.p
    if (this.life <= 0) return

    p.push()
    p.noFill()
    p.stroke(p.red(this.color), p.green(this.color), p.blue(this.color), this.life * 200)
    p.strokeWeight(this.strokeWeight * this.life)
    p.ellipse(this.x, this.y, this.radius * 2, this.radius * 2)
    p.pop()
  }

  isDead() {
    return this.radius >= this.maxRadius
  }
}

/**
 * Create a burst of confetti particles
 */
export function createConfettiBurst(p, x, y, count = 50, options = {}) {
  const particles = []
  for (let i = 0; i < count; i++) {
    const angle = p.random(p.TWO_PI)
    const speed = p.random(5, 15)
    particles.push(new ConfettiParticle(p, x, y, {
      vx: p.cos(angle) * speed,
      vy: p.sin(angle) * speed - 5,
      ...options
    }))
  }
  return particles
}

/**
 * Create floating stars
 */
export function createStarBurst(p, x, y, count = 10, options = {}) {
  const particles = []
  for (let i = 0; i < count; i++) {
    particles.push(new StarParticle(p, x, y, options))
  }
  return particles
}

/**
 * Create sparkle effect around a point
 */
export function createSparkles(p, x, y, count = 20, radius = 50, options = {}) {
  const particles = []
  for (let i = 0; i < count; i++) {
    const angle = p.random(p.TWO_PI)
    const r = p.random(radius)
    particles.push(new SparkleParticle(p, x + p.cos(angle) * r, y + p.sin(angle) * r, options))
  }
  return particles
}
