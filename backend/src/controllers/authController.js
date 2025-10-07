import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import db from '../database/db.js'

/**
 * Register new teacher account
 * POST /api/auth/register
 * Body: { name, email, password, school }
 */
export async function register(req, res) {
  try {
    const { name, email, password, school } = req.body

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email, and password are required'
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters'
      })
    }

    // Check if user already exists
    const existing = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    )

    if (existing.rows.length > 0) {
      return res.status(400).json({
        message: 'Email already registered'
      })
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10)

    // Insert user
    const result = await db.query(
      `INSERT INTO users (name, email, password_hash, school, role)
       VALUES ($1, $2, $3, $4, 'teacher')
       RETURNING id, name, email, school, role, created_at`,
      [name, email.toLowerCase(), password_hash, school || null]
    )

    const user = result.rows[0]

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Log analytics event
    await db.query(
      `INSERT INTO analytics_events (event_type, user_id, properties)
       VALUES ($1, $2, $3)`,
      ['user_registered', user.id, JSON.stringify({ source: 'web' })]
    )

    res.json({
      user,
      token,
      message: 'Account created successfully'
    })

  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({
      message: 'Registration failed. Please try again.'
    })
  }
}

/**
 * Login existing teacher
 * POST /api/auth/login
 * Body: { email, password }
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      })
    }

    // Find user
    const result = await db.query(
      `SELECT id, name, email, password_hash, school, role, created_at
       FROM users
       WHERE email = $1`,
      [email.toLowerCase()]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: 'Invalid email or password'
      })
    }

    const user = result.rows[0]

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash)

    if (!validPassword) {
      return res.status(401).json({
        message: 'Invalid email or password'
      })
    }

    // Remove password hash from response
    delete user.password_hash

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    // Update last login
    await db.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    )

    // Log analytics event
    await db.query(
      `INSERT INTO analytics_events (event_type, user_id)
       VALUES ($1, $2)`,
      ['user_logged_in', user.id]
    )

    res.json({
      user,
      token,
      message: 'Login successful'
    })

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      message: 'Login failed. Please try again.'
    })
  }
}

/**
 * Verify token and get current user
 * GET /api/auth/me
 * Headers: Authorization: Bearer <token>
 */
export async function getCurrentUser(req, res) {
  try {
    // req.user is set by auth middleware
    const result = await db.query(
      `SELECT id, name, email, school, role, created_at, last_login
       FROM users
       WHERE id = $1`,
      [req.user.userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({ user: result.rows[0] })

  } catch (error) {
    console.error('Get current user error:', error)
    res.status(500).json({ message: 'Failed to get user info' })
  }
}
