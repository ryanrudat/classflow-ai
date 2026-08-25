import { google } from 'googleapis'

/**
 * Google Classroom Service
 * Handles OAuth and API interactions with Google Classroom
 */

// OAuth2 Configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google/callback'
)

// Scopes required for Google Classroom integration
const SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/classroom.profile.emails',
  'https://www.googleapis.com/auth/classroom.coursework.students',
  'https://www.googleapis.com/auth/classroom.student-submissions.students.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
]

/**
 * Generate OAuth authorization URL
 */
export function getAuthUrl(userId) {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: userId, // Pass user ID to link account after OAuth
    prompt: 'consent' // Force consent screen to get refresh token
  })

  return authUrl
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokensFromCode(code) {
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

/**
 * Set credentials for API calls
 */
export function setCredentials(tokens) {
  oauth2Client.setCredentials(tokens)
  return oauth2Client
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken) {
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  const { credentials } = await oauth2Client.refreshAccessToken()
  return credentials
}

/**
 * Get user's Google Classroom courses
 */
export async function getCourses(auth) {
  const classroom = google.classroom({ version: 'v1', auth })

  const response = await classroom.courses.list({
    courseStates: ['ACTIVE'],
    teacherId: 'me'
  })

  return response.data.courses || []
}

/**
 * Get students in a specific course
 */
export async function getCourseStudents(auth, courseId) {
  const classroom = google.classroom({ version: 'v1', auth })

  const response = await classroom.courses.students.list({
    courseId,
    pageSize: 100
  })

  return response.data.students || []
}

/**
 * Get teacher's profile information
 */
export async function getTeacherProfile(auth) {
  const classroom = google.classroom({ version: 'v1', auth })
  const oauth2 = google.oauth2({ version: 'v2', auth })

  // Get user info
  const userInfo = await oauth2.userinfo.get()

  return {
    id: userInfo.data.id,
    email: userInfo.data.email,
    name: userInfo.data.name,
    picture: userInfo.data.picture
  }
}

/**
 * Create coursework (assignment) in Google Classroom
 */
export async function createCoursework(auth, courseId, assignment) {
  const classroom = google.classroom({ version: 'v1', auth })

  const coursework = {
    courseId,
    title: assignment.title,
    description: assignment.description,
    workType: 'ASSIGNMENT',
    state: 'PUBLISHED',
    maxPoints: assignment.maxPoints || 100,
    ...(assignment.dueDate && {
      dueDate: {
        year: assignment.dueDate.year,
        month: assignment.dueDate.month,
        day: assignment.dueDate.day
      }
    })
  }

  const response = await classroom.courses.courseWork.create({
    courseId,
    requestBody: coursework
  })

  return response.data
}

/**
 * Update student submission grade
 */
export async function gradeSubmission(auth, courseId, courseWorkId, submissionId, grade) {
  const classroom = google.classroom({ version: 'v1', auth })

  const response = await classroom.courses.courseWork.studentSubmissions.patch({
    courseId,
    courseWorkId,
    id: submissionId,
    updateMask: 'assignedGrade',
    requestBody: {
      assignedGrade: grade
    }
  })

  return response.data
}

/**
 * Get student submissions for coursework
 */
export async function getStudentSubmissions(auth, courseId, courseWorkId) {
  const classroom = google.classroom({ version: 'v1', auth })

  const response = await classroom.courses.courseWork.studentSubmissions.list({
    courseId,
    courseWorkId,
    pageSize: 100
  })

  return response.data.studentSubmissions || []
}

/**
 * Batch update grades for multiple students
 */
export async function batchUpdateGrades(auth, courseId, courseWorkId, grades) {
  const classroom = google.classroom({ version: 'v1', auth })

  const updatePromises = grades.map(({ submissionId, grade }) =>
    gradeSubmission(auth, courseId, courseWorkId, submissionId, grade)
  )

  return await Promise.all(updatePromises)
}

/**
 * Share ClassFlow activity to Google Classroom
 */
export async function shareActivityToClassroom(auth, courseId, activity, sessionUrl) {
  const description = `
${activity.description || 'Complete this activity in ClassFlow AI'}

Access the activity here: ${sessionUrl}

This activity was created and shared from ClassFlow AI.
  `.trim()

  return await createCoursework(auth, courseId, {
    title: activity.title,
    description,
    maxPoints: activity.maxPoints || 100
  })
}

export default {
  getAuthUrl,
  getTokensFromCode,
  setCredentials,
  refreshAccessToken,
  getCourses,
  getCourseStudents,
  getTeacherProfile,
  createCoursework,
  gradeSubmission,
  getStudentSubmissions,
  batchUpdateGrades,
  shareActivityToClassroom
}
