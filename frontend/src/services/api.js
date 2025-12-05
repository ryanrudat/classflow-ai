import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auth API
export const authAPI = {
  register: async (data) => {
    const response = await api.post('/auth/register', data)
    return response.data
  },

  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password })
    return response.data
  }
}

// Sessions API
export const sessionsAPI = {
  create: async (data) => {
    const response = await api.post('/sessions', data)
    return response.data
  },

  getAll: async (status = null) => {
    const url = status ? `/sessions?status=${status}` : '/sessions'
    const response = await api.get(url)
    return response.data
  },

  get: async (sessionId) => {
    const response = await api.get(`/sessions/${sessionId}`)
    return response.data
  },

  end: async (sessionId) => {
    const response = await api.post(`/sessions/${sessionId}/end`)
    return response.data
  },

  reactivate: async (sessionId, resumeInstanceId = null, label = null) => {
    const response = await api.post(`/sessions/${sessionId}/reactivate`, {
      resumeInstanceId,
      label
    })
    return response.data
  },

  delete: async (sessionId) => {
    const response = await api.delete(`/sessions/${sessionId}`)
    return response.data
  },

  join: async (joinCode, studentName, deviceType) => {
    const response = await api.post('/sessions/join', { joinCode, studentName, deviceType })
    return response.data
  },

  getActivities: async (sessionId, pushedOnly = false) => {
    const url = pushedOnly
      ? `/sessions/${sessionId}/activities?pushedOnly=true`
      : `/sessions/${sessionId}/activities`
    const response = await api.get(url)
    return response.data
  },

  getInstances: async (sessionId) => {
    const response = await api.get(`/sessions/${sessionId}/instances`)
    return response.data
  },

  getInstanceDetails: async (sessionId, instanceId) => {
    const response = await api.get(`/sessions/${sessionId}/instances/${instanceId}`)
    return response.data
  },

  exportGrades: async (sessionId, instanceId = null) => {
    const url = instanceId
      ? `/sessions/${sessionId}/export-grades?instanceId=${instanceId}&format=csv`
      : `/sessions/${sessionId}/export-grades?format=csv`

    // Use raw fetch instead of axios to handle CSV download
    const token = JSON.parse(localStorage.getItem('auth-storage') || '{}')?.state?.token

    const response = await fetch(`${API_URL}/api${url}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to export grades')
    }

    // Get the filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition')
    const filename = contentDisposition
      ? contentDisposition.split('filename=')[1].replace(/"/g, '')
      : 'grades.csv'

    // Create blob and download
    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(downloadUrl)

    return { success: true, filename }
  }
}

// AI API
export const aiAPI = {
  generate: async (data) => {
    const response = await api.post('/ai/generate', data)
    return response.data
  },

  adapt: async (activityId, studentId, direction) => {
    const response = await api.post('/ai/adapt', { activityId, studentId, direction })
    return response.data
  }
}

// Activities API
export const activitiesAPI = {
  push: async (activityId, target, studentIds = []) => {
    const response = await api.post(`/activities/${activityId}/push`, { target, studentIds })
    return response.data
  },

  respond: async (activityId, studentId, responseData) => {
    const response = await api.post(`/activities/${activityId}/respond`, {
      studentId,
      response: responseData
    })
    return response.data
  },

  submitQuestion: async (activityId, data) => {
    const response = await api.post(`/activities/${activityId}/submit-question`, data)
    return response.data
  },

  updateContent: async (activityId, content) => {
    const response = await api.put(`/activities/${activityId}/content`, { content })
    return response.data
  }
}

// Analytics API
export const analyticsAPI = {
  getSessionAnalytics: async (sessionId, instanceId = null) => {
    const url = instanceId
      ? `/sessions/${sessionId}/analytics?instanceId=${instanceId}`
      : `/sessions/${sessionId}/analytics`
    const response = await api.get(url)
    return response.data
  },

  getStudentAnalytics: async (studentId) => {
    const response = await api.get(`/students/${studentId}/analytics`)
    return response.data
  }
}

// Slides API
export const slidesAPI = {
  // Generate a new slide deck with AI
  generate: async (sessionId, topic, gradeLevel, difficulty, slideCount, includeQuizzes = true, presentationStyle = 'professional') => {
    const response = await api.post('/slides/generate', {
      sessionId,
      topic,
      gradeLevel,
      difficulty,
      slideCount,
      includeQuizzes,
      presentationStyle
    })
    return response.data
  },

  // Get a deck with all slides
  getDeck: async (deckId) => {
    const response = await api.get(`/slides/decks/${deckId}`)
    return response.data
  },

  // Update a single slide
  updateSlide: async (slideId, updates) => {
    const response = await api.put(`/slides/${slideId}`, updates)
    return response.data
  },

  // Delete a slide
  deleteSlide: async (slideId) => {
    const response = await api.delete(`/slides/${slideId}`)
    return response.data
  },

  // Generate easier/harder variant
  generateVariant: async (slideId, direction) => {
    const response = await api.post(`/slides/${slideId}/variant`, { direction })
    return response.data
  },

  // Get all decks for a session
  getSessionDecks: async (sessionId) => {
    const response = await api.get(`/slides/sessions/${sessionId}/decks`)
    return response.data
  },

  // Create a blank slide
  createBlankSlide: async (deckId, title = 'Untitled Slide', position = null) => {
    const response = await api.post(`/slides/decks/${deckId}/slides`, {
      title,
      position
    })
    return response.data
  },

  // Duplicate an existing slide
  duplicateSlide: async (slideId) => {
    const response = await api.post(`/slides/${slideId}/duplicate`)
    return response.data
  },

  // Reorder slides in a deck
  reorderSlides: async (deckId, slides) => {
    const response = await api.put(`/slides/decks/${deckId}/reorder`, { slides })
    return response.data
  },

  // Slide Elements API
  // Get all elements for a slide
  getSlideElements: async (slideId) => {
    const response = await api.get(`/slides/${slideId}/elements`)
    return response.data
  },

  // Create a new element
  createElement: async (slideId, elementData) => {
    const response = await api.post(`/slides/${slideId}/elements`, elementData)
    return response.data
  },

  // Update an element
  updateElement: async (elementId, updates) => {
    const response = await api.put(`/slides/elements/${elementId}`, updates)
    return response.data
  },

  // Delete an element
  deleteElement: async (elementId) => {
    const response = await api.delete(`/slides/elements/${elementId}`)
    return response.data
  },

  // Reorder elements (update z-index)
  reorderElements: async (slideId, elements) => {
    const response = await api.put(`/slides/${slideId}/elements/reorder`, { elements })
    return response.data
  }
}

// Upload API
export const uploadAPI = {
  // Upload an image
  uploadImage: async (file) => {
    const formData = new FormData()
    formData.append('image', file)

    const response = await api.post('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  },

  // Get user's uploaded images
  getImages: async (limit = 50, offset = 0) => {
    const response = await api.get(`/upload/images?limit=${limit}&offset=${offset}`)
    return response.data
  },

  // Delete an image
  deleteImage: async (imageId) => {
    const response = await api.delete(`/upload/images/${imageId}`)
    return response.data
  }
}

// Presentation API
export const presentationAPI = {
  // Start a presentation
  start: async (deckId, mode = 'student') => {
    const response = await api.post('/presentation/start', { deckId, mode })
    return response.data
  },

  // Navigate to a slide (teacher controls)
  navigate: async (deckId, slideNumber) => {
    const response = await api.post('/presentation/navigate', { deckId, slideNumber })
    return response.data
  },

  // Change presentation mode
  changeMode: async (deckId, mode) => {
    const response = await api.post('/presentation/mode', { deckId, mode })
    return response.data
  },

  // Get student progress
  getProgress: async (deckId) => {
    const response = await api.get(`/presentation/${deckId}/progress`)
    return response.data
  },

  // Set checkpoints for bounded mode
  setCheckpoints: async (deckId, slideNumbers) => {
    const response = await api.post('/presentation/checkpoints', { deckId, slideNumbers })
    return response.data
  }
}

// Student Help API
export const studentHelpAPI = {
  // Request help when student gets a question wrong
  requestHelp: async (data) => {
    const response = await api.post('/student-help/request', data)
    return response.data
  },

  // Accept simpler version of question
  acceptSimplerVersion: async (data) => {
    const response = await api.post('/student-help/accept-simpler', data)
    return response.data
  },

  // Get help history for a session (teacher only)
  getHistory: async (sessionId, studentId = null, limit = 50) => {
    const url = studentId
      ? `/student-help/history/${sessionId}?studentId=${studentId}&limit=${limit}`
      : `/student-help/history/${sessionId}?limit=${limit}`
    const response = await api.get(url)
    return response.data
  }
}

// Student Auth API
export const studentAuthAPI = {
  // Register new student account
  register: async (data) => {
    const response = await api.post('/students/register', data)
    return response.data
  },

  // Login student
  login: async (email, password) => {
    const response = await api.post('/students/login', { email, password })
    return response.data
  },

  // Get current student profile
  me: async () => {
    const response = await api.get('/students/me')
    return response.data
  },

  // Get student's completions for a session
  getCompletions: async (sessionId) => {
    const response = await api.get(`/students/completions/${sessionId}`)
    return response.data
  }
}

// Activity Completion API (teacher controls)
export const completionAPI = {
  // Get completion status for a student (teacher view)
  getStudentCompletions: async (studentAccountId, sessionId = null) => {
    const url = sessionId
      ? `/activities/completions/${studentAccountId}?sessionId=${sessionId}`
      : `/activities/completions/${studentAccountId}`
    const response = await api.get(url)
    return response.data
  },

  // Unlock activity for retakes (teacher only)
  unlockActivity: async (activityId, studentAccountId, reason = null) => {
    const response = await api.post(`/activities/${activityId}/unlock`, {
      studentAccountId,
      reason
    })
    return response.data
  }
}

// Google Classroom API
export const googleClassroomAPI = {
  // Get auth URL to initiate OAuth flow
  getAuthUrl: async () => {
    const response = await api.get('/google/auth')
    return response.data
  },

  // Check connection status
  getStatus: async () => {
    const response = await api.get('/google/status')
    return response.data
  },

  // Disconnect Google Classroom
  disconnect: async () => {
    const response = await api.delete('/google/disconnect')
    return response.data
  },

  // Get user's Google Classroom courses
  getCourses: async () => {
    const response = await api.get('/google/courses')
    return response.data
  },

  // Get students in a specific course
  getCourseStudents: async (courseId) => {
    const response = await api.get(`/google/courses/${courseId}/students`)
    return response.data
  },

  // Import roster from Google Classroom
  importRoster: async (courseId, sessionId) => {
    const response = await api.post(`/google/courses/${courseId}/import-roster`, {
      sessionId
    })
    return response.data
  },

  // Share activity to Google Classroom
  shareActivity: async (courseId, activityId, sessionId) => {
    const response = await api.post(`/google/courses/${courseId}/share-activity`, {
      activityId,
      sessionId
    })
    return response.data
  },

  // Sync grades to Google Classroom
  syncGrades: async (activityId, courseId, courseworkId) => {
    const response = await api.post('/google/sync-grades', {
      activityId,
      courseId,
      courseworkId
    })
    return response.data
  }
}

// Subjects & Standards API
export const subjectsAPI = {
  // Get all subjects (flat list)
  getAll: async () => {
    const response = await api.get('/subjects')
    return response.data
  },

  // Get subjects as hierarchical tree
  getTree: async () => {
    const response = await api.get('/subjects/tree')
    return response.data
  },

  // Get children of a subject
  getChildren: async (parentId) => {
    const response = await api.get(`/subjects/${parentId}/children`)
    return response.data
  }
}

export const standardsAPI = {
  // Get all standards frameworks
  getFrameworks: async () => {
    const response = await api.get('/standards/frameworks')
    return response.data
  },

  // Get recommended standards for subject/grade
  getRecommended: async (subjectId, gradeLevel) => {
    const response = await api.get(`/standards/recommended?subjectId=${subjectId}&gradeLevel=${gradeLevel}`)
    return response.data
  },

  // Link standards to a topic
  linkToTopic: async (topicId, standardIds) => {
    const response = await api.post(`/standards/topic/${topicId}`, { standardIds })
    return response.data
  }
}

// Collaboration API
export const collaborationAPI = {
  // Join waiting room for Tag-Team matching
  joinWaitingRoom: async (sessionId, studentId, studentName, topicId) => {
    const response = await api.post('/collaboration/waiting-room/join', {
      sessionId,
      studentId,
      studentName,
      topicId
    })
    return response.data
  },

  // Leave waiting room
  leaveWaitingRoom: async (sessionId, studentId, topicId) => {
    const response = await api.post('/collaboration/waiting-room/leave', {
      sessionId,
      studentId,
      topicId
    })
    return response.data
  },

  // Create collaborative session (when match found)
  createSession: async (topicId, studentIds) => {
    const response = await api.post('/collaboration/sessions', {
      topicId,
      studentIds
    })
    return response.data
  },

  // Get collaborative session details
  getSession: async (collabSessionId) => {
    const response = await api.get(`/collaboration/sessions/${collabSessionId}`)
    return response.data
  },

  // Tag partner (pass turn)
  tagPartner: async (collabSessionId, fromStudentId, toStudentId) => {
    const response = await api.post(`/collaboration/sessions/${collabSessionId}/tag`, {
      fromStudentId,
      toStudentId
    })
    return response.data
  },

  // Send partner chat message (text only between partners)
  sendChatMessage: async (collabSessionId, studentId, studentName, message) => {
    const response = await api.post(`/collaboration/chat/${collabSessionId}`, {
      senderId: studentId,
      senderName: studentName,
      content: message
    })
    return response.data
  },

  // Get chat history
  getChatHistory: async (collabSessionId) => {
    const response = await api.get(`/collaboration/chat/${collabSessionId}`)
    return response.data
  },

  // Teacher dashboard - get all collaborative sessions
  getDashboard: async (sessionId) => {
    const response = await api.get(`/collaboration/dashboard/${sessionId}`)
    return response.data
  }
}

export default api
