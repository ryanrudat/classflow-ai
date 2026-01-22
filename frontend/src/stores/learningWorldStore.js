import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { learningWorldsAPI } from '../services/api'

/**
 * Learning Worlds Store
 *
 * Manages state for the Learning Worlds feature:
 * - World/land/activity data
 * - Session state (current view, control mode)
 * - Navigation state
 * - Audio settings
 */
export const useLearningWorldStore = create(
  persist(
    (set, get) => ({
      // ============================================================
      // STATE
      // ============================================================

      // World data
      worlds: [],
      currentWorld: null,
      currentLand: null,
      currentActivity: null,

      // Session state
      worldSession: null,
      sessionId: null, // Main session ID for join codes
      joinCode: null,
      isTeacher: true,

      // Navigation
      currentView: 'world_map', // 'world_map' | 'land_view' | 'activity'
      previousView: null,
      zoomTarget: null, // { x, y, scale } for zoom animations

      // Control mode
      controlMode: 'teacher', // 'teacher' | 'student_touch' | 'hybrid'

      // Age level
      ageLevel: 2, // 1 = 4-6, 2 = 7-8, 3 = 9-10

      // Audio
      audioEnabled: true,
      musicEnabled: true,
      volumeLevel: 80,

      // Loading states
      loading: false,
      error: null,

      // Student progress (for current session)
      studentProgress: {},

      // ============================================================
      // WORLD ACTIONS
      // ============================================================

      fetchWorlds: async () => {
        set({ loading: true, error: null })
        try {
          const data = await learningWorldsAPI.getWorlds()
          set({ worlds: data.worlds, loading: false })
          return { success: true, worlds: data.worlds }
        } catch (error) {
          set({ loading: false, error: error.message })
          return { success: false, error: error.message }
        }
      },

      fetchWorld: async (worldId) => {
        set({ loading: true, error: null })
        try {
          const data = await learningWorldsAPI.getWorld(worldId)
          // Merge lands and characters into the world object for easy access
          const worldWithData = {
            ...data.world,
            lands: data.lands || [],
            characters: data.characters || []
          }
          set({
            currentWorld: worldWithData,
            loading: false
          })
          return { success: true, data }
        } catch (error) {
          set({ loading: false, error: error.message })
          return { success: false, error: error.message }
        }
      },

      createWorld: async (worldData) => {
        set({ loading: true, error: null })
        try {
          const data = await learningWorldsAPI.createWorld(worldData)
          const { worlds } = get()
          set({
            worlds: [data.world, ...worlds],
            currentWorld: data.world,
            loading: false
          })
          return { success: true, world: data.world }
        } catch (error) {
          set({ loading: false, error: error.message })
          return { success: false, error: error.message }
        }
      },

      updateWorld: async (worldId, worldData) => {
        set({ loading: true, error: null })
        try {
          const data = await learningWorldsAPI.updateWorld(worldId, worldData)
          const { worlds, currentWorld } = get()
          set({
            worlds: worlds.map(w => w.id === worldId ? data.world : w),
            currentWorld: currentWorld?.id === worldId ? data.world : currentWorld,
            loading: false
          })
          return { success: true, world: data.world }
        } catch (error) {
          set({ loading: false, error: error.message })
          return { success: false, error: error.message }
        }
      },

      deleteWorld: async (worldId) => {
        set({ loading: true, error: null })
        try {
          await learningWorldsAPI.deleteWorld(worldId)
          const { worlds, currentWorld } = get()
          set({
            worlds: worlds.filter(w => w.id !== worldId),
            currentWorld: currentWorld?.id === worldId ? null : currentWorld,
            loading: false
          })
          return { success: true }
        } catch (error) {
          set({ loading: false, error: error.message })
          return { success: false, error: error.message }
        }
      },

      setCurrentWorld: (world) => set({ currentWorld: world }),

      // ============================================================
      // LAND ACTIONS
      // ============================================================

      fetchLand: async (landId) => {
        set({ loading: true, error: null })
        try {
          const data = await learningWorldsAPI.getLand(landId)
          // Merge activities and vocabulary into the land object for easy access
          const landWithData = {
            ...data.land,
            activities: data.activities || [],
            vocabulary: data.vocabulary || []
          }
          set({
            currentLand: landWithData,
            loading: false
          })
          return { success: true, data }
        } catch (error) {
          set({ loading: false, error: error.message })
          return { success: false, error: error.message }
        }
      },

      createLand: async (worldId, landData) => {
        set({ loading: true, error: null })
        try {
          const data = await learningWorldsAPI.createLand(worldId, landData)
          // Refresh world to get updated lands
          await get().fetchWorld(worldId)
          set({ loading: false })
          return { success: true, land: data.land }
        } catch (error) {
          set({ loading: false, error: error.message })
          return { success: false, error: error.message }
        }
      },

      updateLand: async (landId, landData) => {
        set({ loading: true, error: null })
        try {
          const data = await learningWorldsAPI.updateLand(landId, landData)
          set({ currentLand: data.land, loading: false })
          return { success: true, land: data.land }
        } catch (error) {
          set({ loading: false, error: error.message })
          return { success: false, error: error.message }
        }
      },

      deleteLand: async (landId) => {
        set({ loading: true, error: null })
        try {
          await learningWorldsAPI.deleteLand(landId)
          const { currentLand, currentWorld } = get()
          if (currentWorld) {
            await get().fetchWorld(currentWorld.id)
          }
          set({
            currentLand: currentLand?.id === landId ? null : currentLand,
            loading: false
          })
          return { success: true }
        } catch (error) {
          set({ loading: false, error: error.message })
          return { success: false, error: error.message }
        }
      },

      setCurrentLand: (land) => set({ currentLand: land }),

      // ============================================================
      // ACTIVITY ACTIONS
      // ============================================================

      createActivity: async (landId, activityData) => {
        set({ loading: true, error: null })
        try {
          const data = await learningWorldsAPI.createActivity(landId, activityData)
          // Refresh land to get updated activities
          await get().fetchLand(landId)
          set({ loading: false })
          return { success: true, activity: data.activity }
        } catch (error) {
          set({ loading: false, error: error.message })
          return { success: false, error: error.message }
        }
      },

      updateActivity: async (activityId, activityData) => {
        set({ loading: true, error: null })
        try {
          const data = await learningWorldsAPI.updateActivity(activityId, activityData)
          set({ currentActivity: data.activity, loading: false })
          return { success: true, activity: data.activity }
        } catch (error) {
          set({ loading: false, error: error.message })
          return { success: false, error: error.message }
        }
      },

      deleteActivity: async (activityId) => {
        set({ loading: true, error: null })
        try {
          await learningWorldsAPI.deleteActivity(activityId)
          const { currentActivity, currentLand } = get()
          if (currentLand) {
            await get().fetchLand(currentLand.id)
          }
          set({
            currentActivity: currentActivity?.id === activityId ? null : currentActivity,
            loading: false
          })
          return { success: true }
        } catch (error) {
          set({ loading: false, error: error.message })
          return { success: false, error: error.message }
        }
      },

      setCurrentActivity: (activity) => set({ currentActivity: activity }),

      // ============================================================
      // SESSION ACTIONS
      // ============================================================

      startSession: async (worldId, options = {}) => {
        set({ loading: true, error: null })
        try {
          const data = await learningWorldsAPI.startSession(worldId, options)
          set({
            worldSession: data.worldSession,
            sessionId: data.session.id,
            joinCode: data.joinCode,
            ageLevel: data.worldSession.age_level,
            controlMode: data.worldSession.control_mode,
            audioEnabled: data.worldSession.audio_enabled,
            musicEnabled: data.worldSession.music_enabled,
            currentView: 'world_map',
            isTeacher: true,
            loading: false
          })
          return { success: true, data }
        } catch (error) {
          set({ loading: false, error: error.message })
          return { success: false, error: error.message }
        }
      },

      fetchSessionState: async (worldSessionId) => {
        try {
          const data = await learningWorldsAPI.getSessionState(worldSessionId)
          set({
            worldSession: data.state,
            currentView: data.state.current_view,
            controlMode: data.state.control_mode,
            audioEnabled: data.state.audio_enabled,
            musicEnabled: data.state.music_enabled,
            ageLevel: data.state.age_level
          })
          return { success: true, state: data.state }
        } catch (error) {
          return { success: false, error: error.message }
        }
      },

      endSession: async () => {
        const { worldSession } = get()
        if (!worldSession) return { success: false, error: 'No active session' }

        try {
          await learningWorldsAPI.endSession(worldSession.id)
          set({
            worldSession: null,
            sessionId: null,
            joinCode: null,
            currentView: 'world_map',
            currentLand: null,
            currentActivity: null
          })
          return { success: true }
        } catch (error) {
          return { success: false, error: error.message }
        }
      },

      // ============================================================
      // NAVIGATION ACTIONS
      // ============================================================

      navigateTo: async (view, options = {}) => {
        const { worldSession, currentView, isTeacher } = get()
        const { landId, activityId, animate = true } = options

        // Store previous view for back navigation
        set({ previousView: currentView })

        // If we have an active session and we're the teacher, sync to server
        if (worldSession && isTeacher) {
          try {
            await learningWorldsAPI.navigate(worldSession.id, {
              view,
              landId: landId || null,
              activityId: activityId || null
            })
          } catch (error) {
            console.error('Navigation sync error:', error)
          }
        }

        // Update local state
        set({
          currentView: view,
          zoomTarget: animate ? { landId, activityId } : null
        })

        // If navigating to land, fetch land data
        if (view === 'land_view' && landId) {
          await get().fetchLand(landId)
        }
      },

      navigateToWorldMap: () => {
        get().navigateTo('world_map')
        set({ currentLand: null, currentActivity: null })
      },

      navigateToLand: (landId) => {
        get().navigateTo('land_view', { landId })
      },

      navigateToActivity: async (activityId, activity = null) => {
        get().navigateTo('activity', { activityId })

        if (activity && activity.activity_type) {
          // We have the full activity object with activity_type
          set({ currentActivity: activity })
        } else {
          // Need to fetch the full activity data
          try {
            const data = await learningWorldsAPI.getActivity(activityId)
            if (data.activity) {
              set({ currentActivity: data.activity })
            }
          } catch (error) {
            console.error('Failed to fetch activity:', error)
            // Still set partial activity so UI can show error state
            set({ currentActivity: activity || { id: activityId } })
          }
        }
      },

      goBack: () => {
        const { previousView, currentView, currentLand } = get()

        if (currentView === 'activity') {
          if (currentLand) {
            get().navigateTo('land_view', { landId: currentLand.id, animate: false })
          } else {
            get().navigateToWorldMap()
          }
        } else if (currentView === 'land_view') {
          get().navigateToWorldMap()
        }
      },

      // ============================================================
      // CONTROL MODE ACTIONS
      // ============================================================

      setControlMode: async (mode) => {
        const { worldSession, isTeacher } = get()

        if (worldSession && isTeacher) {
          try {
            await learningWorldsAPI.setControlMode(worldSession.id, mode)
          } catch (error) {
            console.error('Control mode sync error:', error)
          }
        }

        set({ controlMode: mode })
      },

      toggleStudentTouch: () => {
        const { controlMode } = get()
        const newMode = controlMode === 'student_touch' ? 'teacher' : 'student_touch'
        get().setControlMode(newMode)
      },

      // ============================================================
      // AUDIO ACTIONS
      // ============================================================

      setAudioEnabled: (enabled) => set({ audioEnabled: enabled }),
      setMusicEnabled: (enabled) => set({ musicEnabled: enabled }),
      setVolumeLevel: (level) => set({ volumeLevel: level }),

      toggleAudio: () => set(state => ({ audioEnabled: !state.audioEnabled })),
      toggleMusic: () => set(state => ({ musicEnabled: !state.musicEnabled })),

      // ============================================================
      // AGE LEVEL ACTIONS
      // ============================================================

      setAgeLevel: (level) => set({ ageLevel: level }),

      // ============================================================
      // PROGRESS ACTIONS
      // ============================================================

      recordProgress: async (activityId, progressData) => {
        const { worldSession } = get()
        if (!worldSession) return { success: false, error: 'No active session' }

        try {
          const data = await learningWorldsAPI.recordActivityResponse(activityId, {
            worldSessionId: worldSession.id,
            ...progressData
          })
          return { success: true, progress: data.progress }
        } catch (error) {
          return { success: false, error: error.message }
        }
      },

      updateStudentProgress: (studentId, progress) => {
        set(state => ({
          studentProgress: {
            ...state.studentProgress,
            [studentId]: progress
          }
        }))
      },

      // ============================================================
      // TEMPLATE ACTIONS
      // ============================================================

      importTemplate: async (worldId, templateId) => {
        set({ loading: true, error: null })
        try {
          const data = await learningWorldsAPI.importTemplate(worldId, templateId)
          // Refresh world to see new land
          await get().fetchWorld(worldId)
          set({ loading: false })
          return { success: true, land: data.land }
        } catch (error) {
          set({ loading: false, error: error.message })
          return { success: false, error: error.message }
        }
      },

      // ============================================================
      // SOCKET EVENT HANDLERS
      // ============================================================

      handleNavigateEvent: async (data) => {
        set({
          currentView: data.view,
          currentLand: data.landId ? { id: data.landId } : null,
          currentActivity: data.activityId ? { id: data.activityId } : null
        })

        // If navigating to an activity, fetch the full activity data
        if (data.view === 'activity' && data.activityId) {
          try {
            const result = await learningWorldsAPI.getActivity(data.activityId)
            if (result.activity) {
              set({ currentActivity: result.activity })
            }
          } catch (error) {
            console.error('Failed to fetch activity for socket navigation:', error)
          }
        }

        // If navigating to a land, fetch the full land data
        if (data.view === 'land_view' && data.landId) {
          try {
            const result = await learningWorldsAPI.getLand(data.landId)
            if (result.land) {
              set({
                currentLand: {
                  ...result.land,
                  activities: result.activities || [],
                  vocabulary: result.vocabulary || []
                }
              })
            }
          } catch (error) {
            console.error('Failed to fetch land for socket navigation:', error)
          }
        }
      },

      handleControlModeEvent: (data) => {
        set({ controlMode: data.controlMode })
      },

      handleSessionEndedEvent: () => {
        set({
          worldSession: null,
          currentView: 'world_map',
          currentLand: null,
          currentActivity: null
        })
      },

      handleProgressEvent: (data) => {
        const { studentId, progress } = data
        set(state => ({
          studentProgress: {
            ...state.studentProgress,
            [studentId]: {
              ...(state.studentProgress[studentId] || {}),
              [data.activityId]: progress
            }
          }
        }))
      },

      // ============================================================
      // RESET
      // ============================================================

      reset: () => set({
        currentWorld: null,
        currentLand: null,
        currentActivity: null,
        worldSession: null,
        sessionId: null,
        joinCode: null,
        currentView: 'world_map',
        previousView: null,
        zoomTarget: null,
        controlMode: 'teacher',
        studentProgress: {},
        error: null
      }),

      clearError: () => set({ error: null })
    }),
    {
      name: 'learning-world-storage',
      storage: createJSONStorage(() => {
        // Safely access sessionStorage with fallback
        try {
          if (typeof window !== 'undefined' && window.sessionStorage) {
            return sessionStorage
          }
        } catch (e) {
          console.warn('sessionStorage not available:', e)
        }
        // Return a no-op storage if sessionStorage is not available
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {}
        }
      }),
      partialize: (state) => ({
        // Only persist session-related state
        worldSession: state.worldSession,
        sessionId: state.sessionId,
        joinCode: state.joinCode,
        currentView: state.currentView,
        ageLevel: state.ageLevel,
        controlMode: state.controlMode,
        audioEnabled: state.audioEnabled,
        musicEnabled: state.musicEnabled,
        volumeLevel: state.volumeLevel
      })
    }
  )
)
