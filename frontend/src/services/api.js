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

  getStudents: async (sessionId) => {
    const response = await api.get(`/sessions/${sessionId}/students`)
    return response.data
  },

  end: async (sessionId) => {
    const response = await api.post(`/sessions/${sessionId}/end`)
    return response.data
  },

  pause: async (sessionId) => {
    const response = await api.post(`/sessions/${sessionId}/pause`)
    return response.data
  },

  resume: async (sessionId) => {
    const response = await api.post(`/sessions/${sessionId}/resume`)
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

  getInstances: async (sessionId) => {
    const response = await api.get(`/sessions/${sessionId}/instances`)
    return response.data
  },

  getInstanceDetails: async (sessionId, instanceId) => {
    const response = await api.get(`/sessions/${sessionId}/instances/${instanceId}`)
    return response.data
  }
}

// Subjects & Standards API (used by the speaking-topic editor)
export const subjectsAPI = {
  getAll: async () => {
    const response = await api.get('/subjects')
    return response.data
  },

  getTree: async () => {
    const response = await api.get('/subjects/tree')
    return response.data
  },

  getChildren: async (parentId) => {
    const response = await api.get(`/subjects/${parentId}/children`)
    return response.data
  }
}

export const standardsAPI = {
  getFrameworks: async () => {
    const response = await api.get('/standards/frameworks')
    return response.data
  },

  getRecommended: async (subjectId, gradeLevel) => {
    const response = await api.get(`/standards/recommended?subjectId=${subjectId}&gradeLevel=${gradeLevel}`)
    return response.data
  },

  linkToTopic: async (topicId, standardIds) => {
    const response = await api.post(`/standards/topic/${topicId}`, { standardIds })
    return response.data
  }
}

// Speaking packs API (see docs/SPEAKING_PACKS.md)
export const speakingAPI = {
  // Teacher
  listPacks: async () => {
    const response = await api.get('/speaking/packs')
    return response.data
  },
  getSessionPack: async (sessionId, studentId = null) => {
    const url = studentId
      ? `/speaking/sessions/${sessionId}/pack?studentId=${studentId}`
      : `/speaking/sessions/${sessionId}/pack`
    const response = await api.get(url)
    return response.data
  },
  assignPack: async (sessionId, packId) => {
    const response = await api.put(`/speaking/sessions/${sessionId}/pack`, { packId })
    return response.data
  },
  listAttempts: async (sessionId) => {
    const response = await api.get(`/speaking/sessions/${sessionId}/attempts`)
    return response.data
  },
  review: async (attemptId) => {
    const response = await api.get(`/speaking/attempts/${attemptId}/review`)
    return response.data
  },
  teacherEnd: async (attemptId) => {
    const response = await api.post(`/speaking/attempts/${attemptId}/end`, { reason: 'teacher_end' })
    return response.data
  },

  // Student
  startAttempt: async (sessionId, studentId) => {
    const response = await api.post('/speaking/attempts', { sessionId, studentId })
    return response.data
  },
  getAttempt: async (attemptId, studentId) => {
    const response = await api.get(`/speaking/attempts/${attemptId}?studentId=${studentId}`)
    return response.data
  },
  ready: async (attemptId, studentId, stateVersion) => {
    const response = await api.post(`/speaking/attempts/${attemptId}/ready`, { studentId, stateVersion })
    return response.data
  },
  transcribe: async (attemptId, studentId, audioBlob, filename = 'recording.webm') => {
    const form = new FormData()
    form.append('studentId', studentId)
    form.append('audio', audioBlob, filename)
    const response = await api.post(`/speaking/attempts/${attemptId}/transcribe`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000
    })
    return response.data
  },
  submitTurn: async (attemptId, { studentId, turnId, stateVersion, text, rawAsr = null }) => {
    const response = await api.post(
      `/speaking/attempts/${attemptId}/turns`,
      { studentId, turnId, stateVersion, text, rawAsr },
      { timeout: 90000 }
    )
    return response.data
  },
  studentEnd: async (attemptId, studentId) => {
    const response = await api.post(`/speaking/attempts/${attemptId}/end`, { studentId, reason: 'student_end' })
    return response.data
  }
}

export default api
