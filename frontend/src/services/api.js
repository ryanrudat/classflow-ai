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

  reactivate: async (sessionId) => {
    const response = await api.post(`/sessions/${sessionId}/reactivate`)
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
  generate: async (sessionId, topic, gradeLevel, difficulty, slideCount) => {
    const response = await api.post('/slides/generate', {
      sessionId,
      topic,
      gradeLevel,
      difficulty,
      slideCount
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

export default api
