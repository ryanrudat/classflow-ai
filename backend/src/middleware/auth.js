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
      return res.status(401).json({
        message: 'Access token required'
      })
    }

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({
          message: 'Invalid or expired token'
        })
      }

      // Attach user info to request
      req.user = user

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
