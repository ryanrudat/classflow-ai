import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import db from '../database/db.js'

/**
 * Register new student account
 * POST /api/students/register
 * Body: { displayName, email, password, gradeLevel }
 */
export async function registerStudent(req, res) {
  try {
    const { displayName, email, password, gradeLevel } = req.body

    // Validation
    if (!displayName || !email || !password) {
      return res.status(400).json({
        message: 'Display name, email, and password are required'
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters'
      })
    }

    // Check if student already exists
    const existing = await db.query(
      'SELECT id FROM student_accounts WHERE email = $1',
      [email.toLowerCase()]
    )

    if (existing.rows.length > 0) {
      return res.status(400).json({
        message: 'Email already registered'
      })
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10)

    // Insert student account
    const result = await db.query(
      `INSERT INTO student_accounts (display_name, email, password_hash, grade_level)
       VALUES ($1, $2, $3, $4)
       RETURNING id, display_name, email, grade_level, created_at`,
      [displayName, email.toLowerCase(), password_hash, gradeLevel || null]
    )

    const student = result.rows[0]

    // Generate JWT token
    const token = jwt.sign(
      {
        studentId: student.id,
        email: student.email,
        role: 'student'
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' } // Longer expiry for students
    )

    // Log analytics event
    await db.query(
      `INSERT INTO analytics_events (event_type, properties)
       VALUES ($1, $2)`,
      ['student_registered', JSON.stringify({
        studentId: student.id,
        gradeLevel: gradeLevel || 'not_specified'
      })]
    )

    res.json({
      student,
      token,
      message: 'Student account created successfully'
    })

  } catch (error) {
    console.error('Student registration error:', error)
    res.status(500).json({
      message: 'Registration failed. Please try again.'
    })
  }
}

/**
 * Login existing student
 * POST /api/students/login
 * Body: { email, password }
 */
export async function loginStudent(req, res) {
  try {
    const { email, password } = req.body

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      })
    }

    // Find student
    const result = await db.query(
      `SELECT id, display_name, email, password_hash, grade_level, created_at
       FROM student_accounts
       WHERE email = $1`,
      [email.toLowerCase()]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: 'Invalid email or password'
      })
    }

    const student = result.rows[0]

    // Verify password
    const validPassword = await bcrypt.compare(password, student.password_hash)

    if (!validPassword) {
      return res.status(401).json({
        message: 'Invalid email or password'
      })
    }

    // Remove password hash from response
    delete student.password_hash

    // Generate JWT token
    const token = jwt.sign(
      {
        studentId: student.id,
        email: student.email,
        role: 'student'
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )

    // Update last login
    await db.query(
      'UPDATE student_accounts SET last_login = NOW() WHERE id = $1',
      [student.id]
    )

    // Log analytics event
    await db.query(
      `INSERT INTO analytics_events (event_type, properties)
       VALUES ($1, $2)`,
      ['student_logged_in', JSON.stringify({ studentId: student.id })]
    )

    res.json({
      student,
      token,
      message: 'Login successful'
    })

  } catch (error) {
    console.error('Student login error:', error)
    res.status(500).json({
      message: 'Login failed. Please try again.'
    })
  }
}

/**
 * Get current student profile
 * GET /api/students/me
 * Headers: Authorization: Bearer <token>
 */
export async function getCurrentStudent(req, res) {
  try {
    // req.student is set by student auth middleware
    const result = await db.query(
      `SELECT id, display_name, email, grade_level, created_at, last_login
       FROM student_accounts
       WHERE id = $1`,
      [req.student.studentId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' })
    }

    // Also get their session history
    const sessionsResult = await db.query(
      `SELECT DISTINCT
         s.id,
         s.title,
         s.subject,
         si.label as period,
         ss.joined_at
       FROM session_students ss
       JOIN sessions s ON ss.session_id = s.id
       JOIN session_instances si ON ss.instance_id = si.id
       WHERE ss.student_account_id = $1
       ORDER BY ss.joined_at DESC
       LIMIT 10`,
      [req.student.studentId]
    )

    res.json({
      student: result.rows[0],
      recentSessions: sessionsResult.rows
    })

  } catch (error) {
    console.error('Get current student error:', error)
    res.status(500).json({ message: 'Failed to get student info' })
  }
}

/**
 * Get student's activity completion status
 * GET /api/students/completions/:sessionId
 * Headers: Authorization: Bearer <token>
 */
export async function getStudentCompletions(req, res) {
  try {
    const { sessionId } = req.params
    const studentId = req.student.studentId

    const result = await db.query(
      `SELECT
         ac.*,
         a.type as activity_type,
         a.prompt as activity_name
       FROM activity_completions ac
       JOIN activities a ON ac.activity_id = a.id
       WHERE ac.student_account_id = $1 AND ac.session_id = $2
       ORDER BY ac.started_at DESC`,
      [studentId, sessionId]
    )

    res.json({
      completions: result.rows
    })

  } catch (error) {
    console.error('Get student completions error:', error)
    res.status(500).json({ message: 'Failed to get completions' })
  }
}
