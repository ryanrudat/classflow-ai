import db from '../database/db.js'
import googleClassroomService from '../services/googleClassroomService.js'

/**
 * Google Classroom Controller
 * Handles HTTP requests for Google Classroom integration
 */

/**
 * GET /api/google/auth
 * Initiate Google OAuth flow
 */
export async function initiateAuth(req, res) {
  try {
    const userId = req.user.id // From auth middleware

    const authUrl = googleClassroomService.getAuthUrl(userId)

    res.json({ authUrl })
  } catch (error) {
    console.error('Error initiating Google auth:', error)
    res.status(500).json({ message: 'Failed to initiate Google authentication' })
  }
}

/**
 * GET /api/google/callback
 * Handle OAuth callback from Google
 */
export async function handleCallback(req, res) {
  try {
    const { code, state: userId } = req.query

    if (!code) {
      return res.redirect('/dashboard?google_error=no_code')
    }

    // Exchange code for tokens
    const tokens = await googleClassroomService.getTokensFromCode(code)

    // Get teacher profile
    const auth = googleClassroomService.setCredentials(tokens)
    const profile = await googleClassroomService.getTeacherProfile(auth)

    // Store tokens in database
    await db.query(
      `INSERT INTO google_classroom_tokens (user_id, access_token, refresh_token, google_user_id, google_email, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id)
       DO UPDATE SET
         access_token = $2,
         refresh_token = COALESCE($3, google_classroom_tokens.refresh_token),
         google_user_id = $4,
         google_email = $5,
         expires_at = $6,
         updated_at = NOW()`,
      [
        userId,
        tokens.access_token,
        tokens.refresh_token,
        profile.id,
        profile.email,
        new Date(tokens.expiry_date)
      ]
    )

    // Redirect back to dashboard with success
    res.redirect('/dashboard?google_connected=true')
  } catch (error) {
    console.error('Error handling Google callback:', error)
    res.redirect('/dashboard?google_error=callback_failed')
  }
}

/**
 * GET /api/google/status
 * Check if user has connected Google Classroom
 */
export async function getConnectionStatus(req, res) {
  try {
    const userId = req.user.id

    const result = await db.query(
      'SELECT google_user_id, google_email, created_at FROM google_classroom_tokens WHERE user_id = $1',
      [userId]
    )

    if (result.rows.length === 0) {
      return res.json({ connected: false })
    }

    res.json({
      connected: true,
      googleEmail: result.rows[0].google_email,
      connectedAt: result.rows[0].created_at
    })
  } catch (error) {
    console.error('Error checking Google connection status:', error)
    res.status(500).json({ message: 'Failed to check connection status' })
  }
}

/**
 * DELETE /api/google/disconnect
 * Disconnect Google Classroom
 */
export async function disconnect(req, res) {
  try {
    const userId = req.user.id

    await db.query('DELETE FROM google_classroom_tokens WHERE user_id = $1', [userId])

    res.json({ message: 'Google Classroom disconnected successfully' })
  } catch (error) {
    console.error('Error disconnecting Google Classroom:', error)
    res.status(500).json({ message: 'Failed to disconnect Google Classroom' })
  }
}

/**
 * GET /api/google/courses
 * Get user's Google Classroom courses
 */
export async function getCourses(req, res) {
  try {
    const userId = req.user.id

    // Get tokens from database
    const auth = await getAuthForUser(userId)
    if (!auth) {
      return res.status(401).json({ message: 'Google Classroom not connected' })
    }

    // Fetch courses
    const courses = await googleClassroomService.getCourses(auth)

    res.json({ courses })
  } catch (error) {
    console.error('Error fetching courses:', error)
    res.status(500).json({ message: 'Failed to fetch courses from Google Classroom' })
  }
}

/**
 * GET /api/google/courses/:courseId/students
 * Get students in a specific course
 */
export async function getCourseStudents(req, res) {
  try {
    const userId = req.user.id
    const { courseId } = req.params

    const auth = await getAuthForUser(userId)
    if (!auth) {
      return res.status(401).json({ message: 'Google Classroom not connected' })
    }

    const students = await googleClassroomService.getCourseStudents(auth, courseId)

    res.json({ students })
  } catch (error) {
    console.error('Error fetching course students:', error)
    res.status(500).json({ message: 'Failed to fetch students from Google Classroom' })
  }
}

/**
 * POST /api/google/courses/:courseId/import-roster
 * Import roster from Google Classroom to a ClassFlow session
 */
export async function importRoster(req, res) {
  try {
    const userId = req.user.id
    const { courseId } = req.params
    const { sessionId } = req.body

    const auth = await getAuthForUser(userId)
    if (!auth) {
      return res.status(401).json({ message: 'Google Classroom not connected' })
    }

    // Verify session belongs to user
    const sessionCheck = await db.query(
      'SELECT id FROM sessions WHERE id = $1 AND teacher_id = $2',
      [sessionId, userId]
    )

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Session not found' })
    }

    // Get students from Google Classroom
    const students = await googleClassroomService.getCourseStudents(auth, courseId)

    // Import students to session
    const importedStudents = []
    for (const student of students) {
      const studentName = student.profile.name.fullName
      const studentEmail = student.profile.emailAddress

      // Add student to session (similar to how they join manually)
      const result = await db.query(
        `INSERT INTO session_students (session_id, student_name, device_type, google_classroom_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (session_id, google_classroom_id)
         DO UPDATE SET student_name = $2
         RETURNING *`,
        [sessionId, studentName, 'imported', student.userId]
      )

      importedStudents.push({
        id: result.rows[0].id,
        name: studentName,
        email: studentEmail
      })
    }

    res.json({
      message: `Successfully imported ${importedStudents.length} students`,
      students: importedStudents
    })
  } catch (error) {
    console.error('Error importing roster:', error)
    res.status(500).json({ message: 'Failed to import roster from Google Classroom' })
  }
}

/**
 * POST /api/google/courses/:courseId/share-activity
 * Share a ClassFlow activity to Google Classroom
 */
export async function shareActivity(req, res) {
  try {
    const userId = req.user.id
    const { courseId } = req.params
    const { activityId, sessionId } = req.body

    const auth = await getAuthForUser(userId)
    if (!auth) {
      return res.status(401).json({ message: 'Google Classroom not connected' })
    }

    // Get activity details
    const activityResult = await db.query(
      'SELECT * FROM activities WHERE id = $1',
      [activityId]
    )

    if (activityResult.rows.length === 0) {
      return res.status(404).json({ message: 'Activity not found' })
    }

    const activity = activityResult.rows[0]
    const sessionUrl = `${process.env.FRONTEND_URL}/student-join/${sessionId}`

    // Create coursework in Google Classroom
    const coursework = await googleClassroomService.shareActivityToClassroom(
      auth,
      courseId,
      activity,
      sessionUrl
    )

    // Store the mapping between ClassFlow activity and Google Classroom coursework
    await db.query(
      `INSERT INTO google_classroom_coursework (activity_id, course_id, coursework_id, user_id)
       VALUES ($1, $2, $3, $4)`,
      [activityId, courseId, coursework.id, userId]
    )

    res.json({
      message: 'Activity shared to Google Classroom successfully',
      coursework
    })
  } catch (error) {
    console.error('Error sharing activity:', error)
    res.status(500).json({ message: 'Failed to share activity to Google Classroom' })
  }
}

/**
 * POST /api/google/sync-grades
 * Sync grades from ClassFlow to Google Classroom
 */
export async function syncGrades(req, res) {
  try {
    const userId = req.user.id
    const { activityId, courseId, courseworkId } = req.body

    const auth = await getAuthForUser(userId)
    if (!auth) {
      return res.status(401).json({ message: 'Google Classroom not connected' })
    }

    // Get student responses from ClassFlow
    const responses = await db.query(
      `SELECT sr.student_id, ss.google_classroom_id, sr.score
       FROM student_responses sr
       JOIN session_students ss ON sr.student_id = ss.id
       WHERE sr.activity_id = $1 AND ss.google_classroom_id IS NOT NULL`,
      [activityId]
    )

    if (responses.rows.length === 0) {
      return res.json({ message: 'No grades to sync', synced: 0 })
    }

    // Get Google Classroom submissions
    const submissions = await googleClassroomService.getStudentSubmissions(
      auth,
      courseId,
      courseworkId
    )

    // Match ClassFlow students with Google Classroom submissions
    const gradesToSync = []
    for (const response of responses.rows) {
      const submission = submissions.find(
        s => s.userId === response.google_classroom_id
      )

      if (submission) {
        gradesToSync.push({
          submissionId: submission.id,
          grade: response.score
        })
      }
    }

    // Batch update grades
    await googleClassroomService.batchUpdateGrades(
      auth,
      courseId,
      courseworkId,
      gradesToSync
    )

    res.json({
      message: `Successfully synced ${gradesToSync.length} grades to Google Classroom`,
      synced: gradesToSync.length
    })
  } catch (error) {
    console.error('Error syncing grades:', error)
    res.status(500).json({ message: 'Failed to sync grades to Google Classroom' })
  }
}

/**
 * Helper function to get authenticated OAuth2 client for a user
 */
async function getAuthForUser(userId) {
  const result = await db.query(
    'SELECT access_token, refresh_token, expires_at FROM google_classroom_tokens WHERE user_id = $1',
    [userId]
  )

  if (result.rows.length === 0) {
    return null
  }

  const { access_token, refresh_token, expires_at } = result.rows[0]

  // Check if token is expired
  if (new Date() >= new Date(expires_at)) {
    // Refresh the token
    const newTokens = await googleClassroomService.refreshAccessToken(refresh_token)

    // Update database
    await db.query(
      `UPDATE google_classroom_tokens
       SET access_token = $1, expires_at = $2, updated_at = NOW()
       WHERE user_id = $3`,
      [newTokens.access_token, new Date(newTokens.expiry_date), userId]
    )

    return googleClassroomService.setCredentials(newTokens)
  }

  // Use existing token
  return googleClassroomService.setCredentials({ access_token, refresh_token })
}

export default {
  initiateAuth,
  handleCallback,
  getConnectionStatus,
  disconnect,
  getCourses,
  getCourseStudents,
  importRoster,
  shareActivity,
  syncGrades
}
