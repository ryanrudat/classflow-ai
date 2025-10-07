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

  join: async (joinCode, studentName, deviceType) => {
    const response = await api.post('/sessions/join', { joinCode, studentName, deviceType })
    return response.data
  },

  getActivities: async (sessionId) => {
    const response = await api.get(`/sessions/${sessionId}/activities`)
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
  }
}

export default api
