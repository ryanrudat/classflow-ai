import jwt from 'jsonwebtoken'

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to req.user
 */
export function authenticateToken(req, res, next) {
  // Skip authentication for OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    return next()
  }

  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      console.log('❌ Auth failed: No token provided')
      return res.status(401).json({
        message: 'Access token required'
      })
    }

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        console.log('❌ Auth failed: Token verification failed -', err.message)
        console.log('   Token (first 20 chars):', token.substring(0, 20) + '...')
        console.log('   JWT_SECRET exists:', !!process.env.JWT_SECRET)
        return res.status(403).json({
          message: 'Invalid or expired token',
          error: err.message
        })
      }

      // Attach user info to request
      req.user = user
      console.log('✅ Auth successful for user:', user.userId)

      next()
    })

  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(500).json({
      message: 'Authentication failed'
    })
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
export function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return next()
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (!err) {
        req.user = user
      }
      next()
    })

  } catch (error) {
    next()
  }
}

/**
 * Student authentication middleware
 * Verifies JWT token and attaches student info to req.student
 */
export function authenticateStudent(req, res, next) {
  // Skip authentication for OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    return next()
  }

  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        message: 'Access token required'
      })
    }

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({
          message: 'Invalid or expired token'
        })
      }

      // Verify this is a student token
      if (decoded.role !== 'student') {
        return res.status(403).json({
          message: 'Student access required'
        })
      }

      // Attach student info to request
      req.student = decoded

      next()
    })

  } catch (error) {
    console.error('Student auth middleware error:', error)
    res.status(500).json({
      message: 'Authentication failed'
    })
  }
}

/**
 * Optional student authentication middleware
 * Attaches student if token is valid, but doesn't require it
 */
export function optionalStudentAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return next()
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (!err && decoded.role === 'student') {
        req.student = decoded
      }
      next()
    })

  } catch (error) {
    next()
  }
}

/**
 * Either teacher or student authentication middleware
 * Accepts both types of tokens and attaches appropriate user info
 */
export function authenticateTeacherOrStudent(req, res, next) {
  // Skip authentication for OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    return next()
  }

  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({
        message: 'Access token required'
      })
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({
          message: 'Invalid or expired token'
        })
      }

      // Attach appropriate user info based on role
      if (decoded.role === 'student') {
        req.student = decoded
      } else {
        req.user = decoded
      }

      next()
    })

  } catch (error) {
    console.error('Auth middleware error:', error)
    res.status(500).json({
      message: 'Authentication failed'
    })
  }
}
