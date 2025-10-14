import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { studentAuthAPI } from '../services/api'

export const useStudentAuthStore = create(
  persist(
    (set, get) => ({
      student: null,
      token: null,
      loading: false,
      error: null,

      setAuth: (student, token) => set({ student, token, error: null }),

      login: async (email, password) => {
        set({ loading: true, error: null })
        try {
          const data = await studentAuthAPI.login(email, password)
          set({
            student: data.student,
            token: data.token,
            loading: false,
            error: null
          })
          return { success: true, data }
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Login failed'
          set({ loading: false, error: errorMessage })
          return { success: false, error: errorMessage }
        }
      },

      register: async (userData) => {
        set({ loading: true, error: null })
        try {
          const data = await studentAuthAPI.register(userData)
          set({
            student: data.student,
            token: data.token,
            loading: false,
            error: null
          })
          return { success: true, data }
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Registration failed'
          set({ loading: false, error: errorMessage })
          return { success: false, error: errorMessage }
        }
      },

      logout: () => set({ student: null, token: null, error: null }),

      clearError: () => set({ error: null }),

      isAuthenticated: () => {
        const state = get()
        return !!state.token && !!state.student
      }
    }),
    {
      name: 'student-auth-storage',
    }
  )
)
